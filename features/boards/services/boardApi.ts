const BASE = "/api";

// Temporary until Clerk is added
const DEV_USER_ID = "user_test123";

function headers() {
  return {
    "Content-Type": "application/json",
    "x-user-id": DEV_USER_ID,
  };
}

export async function apiFetchBoards() {
  const res = await fetch(`${BASE}/boards`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch boards");
  return res.json();
}

export async function apiCreateBoard(name: string) {
  const res = await fetch(`${BASE}/boards`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name,
      email: `${DEV_USER_ID}@placeholder.dev`,
    }),
  });
  if (!res.ok) throw new Error("Failed to create board");
  return res.json();
}

export async function apiUpdateBoard(boardId: string, name: string) {
  const res = await fetch(`${BASE}/boards/${boardId}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to update board");
  return res.json();
}

export async function apiDeleteBoard(boardId: string) {
  const res = await fetch(`${BASE}/boards/${boardId}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete board");
  return res.json();
}

export async function apiFetchShapes(boardId: string) {
  const res = await fetch(`${BASE}/boards/${boardId}/shapes`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to fetch shapes");
  return res.json();
}

export async function apiCreateShape(boardId: string, shape: object) {
  const res = await fetch(`${BASE}/boards/${boardId}/shapes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(shape),
  });
  if (!res.ok) throw new Error("Failed to create shape");
  return res.json();
}

export async function apiUpdateShape(
  boardId: string,
  shapeId: string,
  props: object,
) {
  const res = await fetch(`${BASE}/boards/${boardId}/shapes/${shapeId}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(props),
  });
  if (!res.ok) throw new Error("Failed to update shape");
  return res.json();
}

export async function apiDeleteShapes(boardId: string, ids: string[]) {
  const res = await fetch(`${BASE}/boards/${boardId}/shapes/batch`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ shapes: [], deletedIds: ids }),
  });
  if (!res.ok) throw new Error("Failed to delete shapes");
  return res.json();
}
