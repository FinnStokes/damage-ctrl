import { v4 as uuidv4 } from "uuid";

type Events = {
  ShoppingPhaseStart: {
    type: "ShoppingPhaseStart";
  };

  CombatPhaseStart: {
    type: "CombatPhaseStart";
  };
};

type State = {
  phase: "init" | "shopping" | "combat";
};

type StateEvent<E extends keyof Events = keyof Events> = Events[E] & {
  type: E;
};

type Effects = {
  ImmediateEffect: {
    type: "immediate";
    event: StateEvent;
  };

  DelayedEffect: {
    type: "delayed";
    afterMillis: number;
    event: StateEvent;
  };

  PredicateEffect: {
    type: "predicate";
    timeout: number;
    predicate: (state: State) => boolean;
    event: StateEvent;
  };
};

type Effect<E extends keyof Effects = keyof Effects> = Effects[E];

type EventHandler<E extends StateEvent> = (
  state: State,
  event: E
) => { state: State; effect?: Effect };

type EventHandlers = {
  [k in keyof Events]: EventHandler<Events[k]>;
};

const eventHandlers: EventHandlers = {
  ShoppingPhaseStart: () => ({
    state: { phase: "shopping" },
    effect: {
      type: "delayed",
      afterMillis: 10000,
      event: {
        type: "CombatPhaseStart",
      },
    },
  }),
  CombatPhaseStart: () => ({
    state: { phase: "combat" },
    effect: {
      type: "delayed",
      afterMillis: 10000,
      event: {
        type: "CombatPhaseStart",
      },
    },
  }),
};

let currentState: State = {
  phase: "init",
};

type EventListener = (state: State, event: StateEvent) => void;

const listeners: EventListener[] = [];

export const addListener = (listener: EventListener) => {
  listeners.push(listener);
};

let pendingPredicates: {
  id: string;
  timeout: NodeJS.Timeout;
  predicate: (state: State) => boolean;
  event: StateEvent;
}[] = [];

export const dispatch = <E extends keyof Events>(
  event: StateEvent<E>
): State => {
  const { state, effect } = (
    eventHandlers[event.type] as EventHandler<typeof event>
  )(currentState, event);
  
  currentState = state;

  switch (effect?.type) {
    case "immediate":
      dispatch(effect.event);
      break;
    case "delayed":
      setTimeout(() => dispatch(effect.event), effect.afterMillis);
      break;
    case "predicate":
      const id = uuidv4();
      const timeout = setTimeout(() => {
        pendingPredicates = pendingPredicates.filter((p) => p.id !== id);
        dispatch(effect.event);
      }, effect.timeout);
      pendingPredicates.push({
        ...effect,
        timeout,
        id,
      });
      break;
  }

  // Collect the events that predicates would fire, and make sure to remove them from the pending array before actioning
  // to avoid recursion.
  const resultingEvents: StateEvent[] = [];
  pendingPredicates = pendingPredicates.flatMap((pendingPredicate) => {
    const satisfied = pendingPredicate.predicate(state);
    if (satisfied) {
      resultingEvents.push(pendingPredicate.event);
      clearTimeout(pendingPredicate.timeout);
      return [];
    }
    else {
      return [pendingPredicate];
    }
  });

  resultingEvents.forEach(dispatch);

  return state;
};
