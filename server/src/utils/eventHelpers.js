export const PARTICIPANT_ROLE_META = {
  host: { label: "主办", color: "#f0b429" },
  manager: { label: "管理", color: "#2da44e" },
  judge: { label: "评委", color: "#d1242f" },
  tester: { label: "实测", color: "#218bff" },
  bs: { label: "bs", color: "#8957e5" },
  contestant: { label: "选手", color: "#6e7781" },
};

export function objectIdEquals(left, right) {
  if (!left || !right) {
    return false;
  }

  return left.toString() === right.toString();
}

export function isAdmin(user) {
  return user?.role === "admin";
}

export function isHost(event, user) {
  return objectIdEquals(event?.createdBy?._id || event?.createdBy, user?._id || user?.id);
}

export function isParticipant(event, userId) {
  return (event?.participants || []).some((participantId) => objectIdEquals(participantId?._id || participantId, userId));
}

export function isManager(event, userId) {
  return (event?.managers || []).some((participantId) => objectIdEquals(participantId?._id || participantId, userId));
}

export function hasWeightedRole(members = [], userId) {
  return members.some((member) => objectIdEquals(member.user?._id || member.user, userId));
}

export function isJudge(event, userId) {
  return hasWeightedRole(event?.judges || [], userId);
}

export function isTester(event, userId) {
  return hasWeightedRole(event?.testers || [], userId);
}

export function isBsMember(event, userId) {
  return (event?.bsMembers || []).some((participantId) => objectIdEquals(participantId?._id || participantId, userId));
}

export function canManageMembers(event, user) {
  return isAdmin(user) || isHost(event, user) || isManager(event, user?._id || user?.id);
}

export function canViewEvent(event, user) {
  if (event.status !== "approved") {
    return isAdmin(user) || isHost(event, user) || isManager(event, user?._id || user?.id);
  }

  if (event.visibility === "public") {
    return true;
  }

  if (!user) {
    return false;
  }

  const userId = user._id || user.id;
  return isAdmin(user) || isHost(event, user) || isParticipant(event, userId) || isManager(event, userId);
}

export function canScoreSubmission(event, userId) {
  if (!userId) {
    return false;
  }

  return (
    isHost(event, { _id: userId }) ||
    isManager(event, userId) ||
    isJudge(event, userId) ||
    isTester(event, userId) ||
    isBsMember(event, userId) ||
    isParticipant(event, userId)
  );
}

export function normalizeRoleAssignments(event) {
  const participantIds = (event.participants || []).map((item) => item.toString());
  const allowedIds = new Set(participantIds);

  event.managers = (event.managers || []).filter((item) => allowedIds.has(item.toString()));
  event.bsMembers = (event.bsMembers || []).filter((item) => allowedIds.has(item.toString()));
  event.judges = (event.judges || []).filter((item) => allowedIds.has((item.user?._id || item.user).toString()));
  event.testers = (event.testers || []).filter((item) => allowedIds.has((item.user?._id || item.user).toString()));

  const managerIds = new Set((event.managers || []).map((item) => item.toString()));
  const judgeIds = new Set((event.judges || []).map((item) => (item.user?._id || item.user).toString()));
  const testerIds = new Set((event.testers || []).map((item) => (item.user?._id || item.user).toString()));
  const bsIds = new Set((event.bsMembers || []).map((item) => item.toString()));

  event.participants = (event.participants || []).filter((item) => {
    const id = item.toString();
    return !managerIds.has(id) || participantIds.includes(id);
  });

  return {
    managerIds,
    judgeIds,
    testerIds,
    bsIds,
  };
}

export function buildParticipantRoles(event, targetUserId, viewer) {
  const viewerId = viewer?._id || viewer?.id;
  const isViewerManager = canManageMembers(event, viewer);
  const roles = [];

  if (objectIdEquals(event.createdBy?._id || event.createdBy, targetUserId)) {
    roles.push({ key: "host", ...PARTICIPANT_ROLE_META.host });
  } else if (isManager(event, targetUserId)) {
    roles.push({ key: "manager", ...PARTICIPANT_ROLE_META.manager });
  }

  const canSeeJudge = event.judgeGroupPublic || isViewerManager || objectIdEquals(viewerId, targetUserId);
  const canSeeTester = event.testGroupPublic || isViewerManager || objectIdEquals(viewerId, targetUserId);
  const canSeeBs = event.bsGroupPublic || isViewerManager || objectIdEquals(viewerId, targetUserId);

  if (event.useJudgeGroup && canSeeJudge && isJudge(event, targetUserId)) {
    roles.push({ key: "judge", ...PARTICIPANT_ROLE_META.judge });
  }

  if (event.useTestGroup && canSeeTester && isTester(event, targetUserId)) {
    roles.push({ key: "tester", ...PARTICIPANT_ROLE_META.tester });
  }

  if (event.useBsGroup && canSeeBs && isBsMember(event, targetUserId)) {
    roles.push({ key: "bs", ...PARTICIPANT_ROLE_META.bs });
  }

  if (!roles.length || roles.every((role) => !["host", "manager"].includes(role.key))) {
    const contestantExcluded =
      isJudge(event, targetUserId) || isTester(event, targetUserId) || isBsMember(event, targetUserId);
    if (!contestantExcluded) {
      roles.push({ key: "contestant", ...PARTICIPANT_ROLE_META.contestant });
    }
  }

  return roles;
}
