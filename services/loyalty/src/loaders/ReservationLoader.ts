import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

export class ReservationLoader {
  readonly reservation;
  readonly reservationEvent;
  readonly reservationEvents;

  constructor(repository: Repository) {
    this.reservation = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.reservation.getByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.reservationEvent = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.reservation.getEventsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.reservationEvents = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.reservation.getEventsByReservationIds(ids);
      const grouped = new Map<string, typeof rows>();
      for (const row of rows)
        grouped.set(row.reservationId, [...(grouped.get(row.reservationId) ?? []), row]);
      return ids.map((id) => grouped.get(id) ?? []);
    });
  }
}
