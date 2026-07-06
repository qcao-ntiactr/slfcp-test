import { useMemo } from 'react';
import { Box, Button, Flex } from '@chakra-ui/react';

interface PaginationFilters {
  page: number;
  pageSize: number;
}

interface PaginationBarProps {
  filters: PaginationFilters;
  //eslint-disable-next-line no-unused-vars
  updateFilters: (filters: Partial<PaginationFilters>) => void;
  totalItems: number;
}

export const PaginationBar = ({
  filters,
  updateFilters,
  totalItems,
}: PaginationBarProps) => {
  const totalPages: number = Math.ceil(totalItems / filters.pageSize);
  const page = Number(filters.page) || 1;

  const paginationNumbers = useMemo(() => {
    // Build the page list dynamically
    let pages: (number | string)[] = [];

    const MAX_VISIBLE_PAGES = 5; // Max pages before ellipsis
    const SIBLING_COUNT = 2; // Number of pages shown around current page

    if (totalPages <= MAX_VISIBLE_PAGES) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      const firstSegment =
        page <= SIBLING_COUNT + 1
          ? Array.from({ length: SIBLING_COUNT * 2 }, (_, i) => i + 1)
          : [1];

      const endSegment =
        page >= totalPages - SIBLING_COUNT
          ? Array.from(
              { length: SIBLING_COUNT * 2 },
              (_, i) => totalPages - SIBLING_COUNT * 2 + i + 1
            )
          : [totalPages];

      const middleSegment =
        page > SIBLING_COUNT + 1 && page < totalPages - SIBLING_COUNT
          ? ['...', page - 1, page, page + 1, '...']
          : ['...'];

      pages = [...firstSegment, ...middleSegment, ...endSegment];
    }

    return pages.map((pageNumber, index) =>
      pageNumber === '...' ? (
        <Box key={`ellipsis-${index}`} px={2}>
          ...
        </Box>
      ) : (
        <Button
          key={`page-${pageNumber}`}
          aria-label={`Navigate to page number ${pageNumber}`}
          onClick={() => updateFilters({ page: Number(pageNumber) })}
          variant="unstyled"
          disabled={pageNumber === page}
          textDecoration={Number(pageNumber) === page ? 'underline' : 'none'}
          color={'#343741'}
        >
          {pageNumber}
        </Button>
      )
    );
  }, [page, totalPages]);

  return (
    <Flex justify="center" align="center" mt={4} gap={2}>
      <Button
        aria-label="Navigate to previous page"
        onClick={() => updateFilters({ page: page - 1 })}
        isDisabled={page === 1}
        variant="unstyled"
      >
        {'<'}
      </Button>

      {paginationNumbers}

      <Button
        aria-label="Navigate to next page"
        onClick={() => updateFilters({ page: page + 1 })}
        isDisabled={page >= totalPages}
        variant="unstyled"
      >
        {'>'}
      </Button>
    </Flex>
  );
};
