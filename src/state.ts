import { v4 as uuidv4 } from "uuid";

type StateEvent<Events, E extends keyof Events = keyof Events> = Events[E] & {
  type: E;
};

type Effects<Events, State> = {
  ImmediateEffect: {
    type: "immediate";
    event: StateEvent<Events>;
  };

  DelayedEffect: {
    type: "delayed";
    afterMillis: number;
    event: StateEvent<Events>;
  };

  PredicateEffect: {
    type: "predicate";
    timeout: number;
    predicate: (state: State) => boolean;
    event: StateEvent<Events>;
  };
};

type Effect<Events, State, E extends keyof Effects<Events, State> = keyof Effects<Events, State>> = Effects<Events, State>[E];

type EventHandler<Events, State, K extends keyof Events> = (
  state: State,
  event: StateEvent<Events, K>
) => { state: State; effect?: Effect<Events, State> };

type EventHandlers<Events, State> = {
  [k in keyof Events]: EventHandler<Events, State, k>;
};

type EventListener = <Events, State>(state: State, event: StateEvent<Events>) => void;

export const initialise = <Events, State>(initial: State, eventHandlers: EventHandlers<Events, State>): {
  addListener: (listener: EventListener) => void,
  dispatch: <E extends keyof Events>(event: StateEvent<Events, E>) => State,
} => {
  let currentState: State = initial;

  const listeners: EventListener[] = [];

  const addListener = (listener: EventListener) => {
    listeners.push(listener);
  };

  let pendingPredicates: {
    id: string;
    timeout: NodeJS.Timeout;
    predicate: (state: State) => boolean;
    event: StateEvent<Events>;
  }[] = [];

  const dispatch = <E extends keyof Events>(
    event: StateEvent<Events, E>
  ): State => {
    const { state, effect } = (
      eventHandlers[event.type] as EventHandler<Events, State, typeof event.type>
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
    const resultingEvents: StateEvent<Events>[] = [];
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

  return {addListener, dispatch};
};

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

export const {addListener, dispatch} = initialise<Events, State>({
  phase: "init",
}, {
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
});
