export function isAdmin(user) {
  return user?.role === "admin";
}

export function isHost(event, user) {
  return event.createdBy?.toString() === user?._id?.toString();
}

export function isParticipant(event, userId) {
  return event.participants.some((participantId) => participantId.toString() === userId.toString());
}

export function canViewEvent(event, user) {
  if (event.status !== "approved") {
    return isAdmin(user) || isHost(event, user);
  }

  if (event.visibility === "public") {
    return true;
  }

  if (!user) {
    return false;
  }

  return isAdmin(user) || isHost(event, user) || isParticipant(event, user._id);
}
