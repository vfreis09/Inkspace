const BASE = "/api";

function baseOptions(): RequestInit {
  return {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  };
}

function withInviteParam(url: string, inviteToken?: string) {
  if (!inviteToken) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}invite=${encodeURIComponent(inviteToken)}`;
}

export async function apiFetchBoards() {
  const res = await fetch(`/api/boards`, {
    credentials: "include",
  });

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    throw new Error("Failed to fetch boards");
  }

  return res.json();
}

export async function apiCreateBoard(name: string) {
  const res = await fetch(`${BASE}/boards`, {
    ...baseOptions(),
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create board");
  return res.json();
}

export async function apiUpdateBoard(
  boardId: string,
  data: { name?: string; isPublic?: boolean },
) {
  const res = await fetch(`${BASE}/boards/${boardId}`, {
    ...baseOptions(),
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update board");
  return res.json();
}

export async function apiDeleteBoard(boardId: string) {
  const res = await fetch(`${BASE}/boards/${boardId}`, {
    ...baseOptions(),
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete board");
  return res.json();
}

export async function apiFetchShapes(boardId: string, inviteToken?: string) {
  const res = await fetch(
    withInviteParam(`${BASE}/boards/${boardId}/shapes`, inviteToken),
    {
      ...baseOptions(),
    },
  );
  if (!res.ok) {
    if (res.status === 403) throw new Error("FORBIDDEN");
    if (res.status === 404) throw new Error("NOT_FOUND");
    throw new Error("Failed to fetch shapes");
  }
  return res.json();
}

export async function apiCreateShape(
  boardId: string,
  shape: object,
  inviteToken?: string,
) {
  const res = await fetch(
    withInviteParam(`${BASE}/boards/${boardId}/shapes`, inviteToken),
    {
      ...baseOptions(),
      method: "POST",
      body: JSON.stringify(shape),
    },
  );
  if (!res.ok) throw new Error("Failed to create shape");
  return res.json();
}

export async function apiUpdateShape(
  boardId: string,
  shapeId: string,
  props: object,
  inviteToken?: string,
) {
  const res = await fetch(
    withInviteParam(`${BASE}/boards/${boardId}/shapes/${shapeId}`, inviteToken),
    {
      ...baseOptions(),
      method: "PUT",
      body: JSON.stringify(props),
    },
  );
  if (!res.ok) throw new Error("Failed to update shape");
  return res.json();
}

export async function apiDeleteShapes(
  boardId: string,
  ids: string[],
  inviteToken?: string,
) {
  const res = await fetch(
    withInviteParam(`${BASE}/boards/${boardId}/shapes/batch`, inviteToken),
    {
      ...baseOptions(),
      method: "PUT",
      body: JSON.stringify({ shapes: [], deletedIds: ids }),
    },
  );
  if (!res.ok) throw new Error("Failed to delete shapes");
  return res.json();
}
