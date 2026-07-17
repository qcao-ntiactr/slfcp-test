import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

type FileTreeNode = {
  children: Map<string, FileTreeNode>;
  isFile: boolean;
};

export function FileTree({ paths }: { paths: string[] }) {
  const tree = useMemo(() => createFileTree(paths), [paths]);
  const allDirectoryPaths = useMemo(() => collectDirectoryPaths(tree), [tree]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const isFullyExpanded =
    allDirectoryPaths.length > 0 &&
    allDirectoryPaths.every((itemPath) => expandedPaths.has(itemPath));

  const toggleDirectory = (itemPath: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(itemPath)) {
        next.delete(itemPath);
      } else {
        next.add(itemPath);
      }
      return next;
    });
  };

  return (
    <Box
      bg="gray.50"
      border="1px solid"
      borderColor="gray.200"
      color="gray.700"
      fontFamily="mono"
      fontSize="sm"
      lineHeight="1.55"
      overflowX="auto"
      px={2}
      py={2}
    >
      <Flex justify="flex-end" mb={2}>
        <Button
          size="xs"
          variant="outline"
          onClick={() =>
            setExpandedPaths(
              isFullyExpanded ? new Set() : new Set(allDirectoryPaths)
            )
          }
        >
          {isFullyExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </Flex>
      <FileTreeRows
        node={tree}
        expandedPaths={expandedPaths}
        onToggleDirectory={toggleDirectory}
      />
    </Box>
  );
}

function createFileTree(paths: string[]) {
  const root: FileTreeNode = { children: new Map(), isFile: false };

  for (const filePath of [...new Set(paths)].sort()) {
    const parts = filePath.split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      if (!current.children.has(part)) {
        current.children.set(part, { children: new Map(), isFile: false });
      }

      current = current.children.get(part) as FileTreeNode;
      current.isFile = index === parts.length - 1;
    });
  }

  return root;
}

function collectDirectoryPaths(node: FileTreeNode, pathPrefix = ''): string[] {
  return getSortedTreeEntries(node).flatMap(([name, child]) => {
    if (child.isFile) return [];

    const itemPath = pathPrefix ? `${pathPrefix}/${name}` : name;
    return [itemPath, ...collectDirectoryPaths(child, itemPath)];
  });
}

function getSortedTreeEntries(node: FileTreeNode) {
  return [...node.children.entries()].sort(([firstName, first], [secondName, second]) => {
    if (first.isFile !== second.isFile) return first.isFile ? 1 : -1;
    return firstName.localeCompare(secondName);
  });
}

function FileTreeRows({
  node,
  depth = 0,
  pathPrefix = '',
  expandedPaths,
  onToggleDirectory,
}: {
  node: FileTreeNode;
  depth?: number;
  pathPrefix?: string;
  expandedPaths: Set<string>;
  onToggleDirectory: (itemPath: string) => void;
}) {
  return (
    <>
      {getSortedTreeEntries(node).map(([name, child]) => {
        const itemPath = pathPrefix ? `${pathPrefix}/${name}` : name;

        if (child.isFile) {
          return (
            <Text
              key={itemPath}
              as="div"
              color="gray.900"
              fontWeight="700"
              pl={`${depth * 1.25}rem`}
              whiteSpace="nowrap"
            >
              - {name}
            </Text>
          );
        }

        return (
          <FileTreeDirectory
            key={itemPath}
            name={name}
            node={child}
            depth={depth}
            itemPath={itemPath}
            expandedPaths={expandedPaths}
            onToggleDirectory={onToggleDirectory}
          />
        );
      })}
    </>
  );
}

function FileTreeDirectory({
  name,
  node,
  depth,
  itemPath,
  expandedPaths,
  onToggleDirectory,
}: {
  name: string;
  node: FileTreeNode;
  depth: number;
  itemPath: string;
  expandedPaths: Set<string>;
  onToggleDirectory: (itemPath: string) => void;
}) {
  const isExpanded = expandedPaths.has(itemPath);

  return (
    <>
      <Button
        aria-expanded={isExpanded}
        h="auto"
        justifyContent="flex-start"
        minH={6}
        pl={`${depth * 1.25}rem`}
        pr={1}
        py={0.5}
        size="xs"
        variant="ghost"
        w="100%"
        color="gray.600"
        fontFamily="mono"
        fontWeight="400"
        _hover={{ bg: 'gray.100' }}
        onClick={() => onToggleDirectory(itemPath)}
      >
        <Text as="span" color="gray.500" display="inline-block" w="1.25rem">
          {isExpanded ? '-' : '+'}
        </Text>
        <Text as="span">{name}/</Text>
      </Button>
      {isExpanded && (
        <FileTreeRows
          node={node}
          depth={depth + 1}
          pathPrefix={itemPath}
          expandedPaths={expandedPaths}
          onToggleDirectory={onToggleDirectory}
        />
      )}
    </>
  );
}
