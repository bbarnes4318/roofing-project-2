export function setQueryParams(next) {
  const url = new URL(location.href);
  Object.entries(next).forEach(([k, v]) => {
    if (v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  });
  history.replaceState(history.state, document.title, url.toString());
}

export function getQueryParam(name) {
  return new URL(location.href).searchParams.get(name);
}


