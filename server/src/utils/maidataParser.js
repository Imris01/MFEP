const difficultyMap = [
  { field: "lv_1", key: "easy", label: "EASY", color: "#66FFFF" },
  { field: "lv_2", key: "basic", label: "BASIC", color: "#00FF80" },
  { field: "lv_3", key: "advanced", label: "ADVANCED", color: "#FFFF66" },
  { field: "lv_4", key: "expert", label: "EXPERT", color: "#FF6666" },
  { field: "lv_5", key: "master", label: "MASTER", color: "#B266FF" },
  { field: "lv_6", key: "remaster", label: "Re:MASTER", color: "#FFCCFF" },
  { field: "lv_7", key: "utage", label: "UTAGE", color: "#FFB266" },
];

function normalize(content) {
  return content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function extract(content, field) {
  const normalized = normalize(content);
  const prefix = `&${field}=`;
  const line = normalized
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return line ? line.slice(prefix.length).trim() : "";
}

export function parseMaidata(content) {
  const title = extract(content, "title");
  const artist = extract(content, "artist");
  const charterName = extract(content, "des");

  const difficulties = difficultyMap
    .map((item) => ({
      ...item,
      value: extract(content, item.field),
    }))
    .filter((item) => item.value)
    .map(({ field, ...item }) => item);

  if (!title || !artist || !charterName) {
    throw new Error("maidata.txt 缺少必要字段：&title、&artist、&des");
  }

  if (!difficulties.length) {
    throw new Error("maidata.txt 至少需要提供一个难度字段（&lv_1 到 &lv_7）");
  }

  return {
    title,
    artist,
    charterName,
    difficulties,
  };
}
