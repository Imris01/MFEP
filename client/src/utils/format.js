export function formatDate(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleDateString("zh-CN");
}

export function formatDateTime(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateRange(start, end) {
  return `${formatDate(start)} 至 ${formatDate(end)}`;
}

export function summarize(text, fallback = "暂无简介") {
  if (!text) {
    return fallback;
  }

  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}
