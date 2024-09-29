export const PAGE_SIZE = 10;

export const paginate = (page: any, count: any) => {
  const totalPages = Math.ceil(count / 10);

  let nextPageLink = null;
  let prevPageLink = null;

  if (page < totalPages) {
    nextPageLink = page + 1;
  }

  if (page > 1) {
    prevPageLink = page - 1;
  }

  return {
    totalPages,
    count,
    currentPage: page,
    nextPageLink,
    prevPageLink,
  };
};
