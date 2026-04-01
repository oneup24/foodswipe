import React, { createContext, useCallback, useContext, useEffect, useReducer } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserList } from "@/lib/types";

const LISTS_KEY = "@foodswipe_lists";

const DEFAULT_LISTS: UserList[] = [
  { id: "plan", name: "Plan to Visit", emoji: "📅", restaurantIds: [], createdAt: 0, isDefault: true },
  { id: "date", name: "Date Night", emoji: "💑", restaurantIds: [], createdAt: 0, isDefault: true },
  { id: "family", name: "Family Dinner", emoji: "👨‍👩‍👧", restaurantIds: [], createdAt: 0, isDefault: true },
  { id: "business", name: "Business Lunch", emoji: "💼", restaurantIds: [], createdAt: 0, isDefault: true },
  { id: "budget", name: "Budget Eats", emoji: "💰", restaurantIds: [], createdAt: 0, isDefault: true },
];

// --- State ---
type State = {
  lists: UserList[];
  loaded: boolean;
};

// --- Actions ---
type Action =
  | { type: "SET_LISTS"; lists: UserList[] }
  | { type: "CREATE_LIST"; list: UserList }
  | { type: "DELETE_LIST"; id: string }
  | { type: "RENAME_LIST"; id: string; name: string; emoji: string }
  | { type: "ADD_TO_LIST"; listId: string; restaurantId: string }
  | { type: "REMOVE_FROM_LIST"; listId: string; restaurantId: string }
  | { type: "REMOVE_RESTAURANT_FROM_ALL"; restaurantId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_LISTS":
      return { ...state, lists: action.lists, loaded: true };

    case "CREATE_LIST":
      return { ...state, lists: [...state.lists, action.list] };

    case "DELETE_LIST":
      return { ...state, lists: state.lists.filter((l) => l.id !== action.id) };

    case "RENAME_LIST":
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.id ? { ...l, name: action.name, emoji: action.emoji } : l
        ),
      };

    case "ADD_TO_LIST":
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.listId && !l.restaurantIds.includes(action.restaurantId)
            ? { ...l, restaurantIds: [...l.restaurantIds, action.restaurantId] }
            : l
        ),
      };

    case "REMOVE_FROM_LIST":
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.listId
            ? { ...l, restaurantIds: l.restaurantIds.filter((id) => id !== action.restaurantId) }
            : l
        ),
      };

    case "REMOVE_RESTAURANT_FROM_ALL":
      return {
        ...state,
        lists: state.lists.map((l) => ({
          ...l,
          restaurantIds: l.restaurantIds.filter((id) => id !== action.restaurantId),
        })),
      };

    default:
      return state;
  }
}

// --- Context ---
type ListsContextValue = {
  lists: UserList[];
  createList: (name: string, emoji: string) => void;
  deleteList: (id: string) => void;
  renameList: (id: string, name: string, emoji: string) => void;
  addToList: (listId: string, restaurantId: string) => void;
  removeFromList: (listId: string, restaurantId: string) => void;
  removeRestaurantFromAll: (restaurantId: string) => void;
  listsForRestaurant: (restaurantId: string) => UserList[];
};

const ListsContext = createContext<ListsContextValue | null>(null);

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lists: [], loaded: false });

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(LISTS_KEY).then((data) => {
      if (data) {
        try {
          const saved = JSON.parse(data) as UserList[];
          // Merge: keep saved lists, add any default lists not yet present
          const savedIds = new Set(saved.map((l) => l.id));
          const merged = [
            ...DEFAULT_LISTS.filter((d) => !savedIds.has(d.id)),
            ...saved,
          ];
          dispatch({ type: "SET_LISTS", lists: merged });
        } catch {
          dispatch({ type: "SET_LISTS", lists: DEFAULT_LISTS });
        }
      } else {
        dispatch({ type: "SET_LISTS", lists: DEFAULT_LISTS });
      }
    });
  }, []);

  // Persist to AsyncStorage whenever lists change (after initial load)
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(LISTS_KEY, JSON.stringify(state.lists));
  }, [state.lists, state.loaded]);

  const createList = useCallback((name: string, emoji: string) => {
    const list: UserList = {
      id: `custom_${Date.now()}`,
      name,
      emoji,
      restaurantIds: [],
      createdAt: Date.now(),
      isDefault: false,
    };
    dispatch({ type: "CREATE_LIST", list });
  }, []);

  const deleteList = useCallback((id: string) => {
    dispatch({ type: "DELETE_LIST", id });
  }, []);

  const renameList = useCallback((id: string, name: string, emoji: string) => {
    dispatch({ type: "RENAME_LIST", id, name, emoji });
  }, []);

  const addToList = useCallback((listId: string, restaurantId: string) => {
    dispatch({ type: "ADD_TO_LIST", listId, restaurantId });
  }, []);

  const removeFromList = useCallback((listId: string, restaurantId: string) => {
    dispatch({ type: "REMOVE_FROM_LIST", listId, restaurantId });
  }, []);

  const removeRestaurantFromAll = useCallback((restaurantId: string) => {
    dispatch({ type: "REMOVE_RESTAURANT_FROM_ALL", restaurantId });
  }, []);

  const listsForRestaurant = useCallback(
    (restaurantId: string) => state.lists.filter((l) => l.restaurantIds.includes(restaurantId)),
    [state.lists]
  );

  return (
    <ListsContext.Provider
      value={{
        lists: state.lists,
        createList,
        deleteList,
        renameList,
        addToList,
        removeFromList,
        removeRestaurantFromAll,
        listsForRestaurant,
      }}
    >
      {children}
    </ListsContext.Provider>
  );
}

export function useLists() {
  const ctx = useContext(ListsContext);
  if (!ctx) throw new Error("useLists must be used within ListsProvider");
  return ctx;
}
