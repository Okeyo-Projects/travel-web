type RoomWithPrice = {
  price_cents: number | null | undefined;
};

function hasValidPrice(
  room: RoomWithPrice | null | undefined,
): room is RoomWithPrice & { price_cents: number } {
  return (
    typeof room?.price_cents === "number" && Number.isFinite(room.price_cents)
  );
}

export function getLowestPricedRoom<T extends RoomWithPrice>(
  rooms: T[] | null | undefined,
): T | null {
  return (rooms ?? []).reduce<T | null>((lowest, room) => {
    if (!hasValidPrice(room)) {
      return lowest;
    }

    if (!hasValidPrice(lowest) || room.price_cents < lowest.price_cents) {
      return room;
    }

    return lowest;
  }, null);
}
