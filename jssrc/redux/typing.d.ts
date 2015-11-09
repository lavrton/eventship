interface BestEvent {
    id: string;
    updated?: number;
    title?: string;
    selectedDayId?: string;
}

interface State {
    startDate: Date;
    events: BestEvent[];
}
