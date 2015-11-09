interface BestEvent {
    id: string;
    updated?: number;
    title?: string;  // for day
    score?: number;  // for day
    selectedDayId?: string;  // for nested event
}

interface State {
    startDate: Date;
    events: BestEvent[];
}
