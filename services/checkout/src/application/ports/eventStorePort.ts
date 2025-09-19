export type AggregateOptions<State, Event> = {
  initialState: State | (() => State);
  evolve: (state: State, event: Event) => State;
};

export type AggregateResult<State> = {
  state: State;
  streamExists: boolean;
  // Current stream version (revision) if available from adapter
  streamVersion?: bigint;
};

export type AppendOptions = {
  expectedStreamVersion?: "STREAM_DOES_NOT_EXIST" | bigint;
};

export interface EventStorePort {
  aggregateStream<State, Event>(
    streamId: string,
    options: AggregateOptions<State, Event>
  ): Promise<AggregateResult<State>>;

  appendToStream<Event>(
    streamId: string,
    events: Event[],
    options?: AppendOptions
  ): Promise<void>;
}
