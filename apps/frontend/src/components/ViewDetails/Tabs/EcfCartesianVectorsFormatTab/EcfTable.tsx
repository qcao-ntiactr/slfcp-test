import { Box, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface EcfTableProps {
  base64ExcelFile: string;
}

type ExcelRow = { [key: string]: string | number | null };
type ExcelData = ExcelRow[];

const parseExcel = (base64WithPrefix: string): ExcelData => {
  // Remove any data URL prefix if present
  const base64 = base64WithPrefix.replace(/^data:.*;base64,/, '');

  // Decode base64 to binary string
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // Read the workbook
  const workbook: XLSX.WorkBook = XLSX.read(bytes, { type: 'array' });
  const sheetName: string = workbook.SheetNames[0];
  const sheet: XLSX.WorkSheet | undefined = workbook.Sheets[sheetName];

  if (!sheet) return [];

  // Convert sheet to JSON, preserving empty cells
  const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
    defval: '', // Include empty cells
  });

  return jsonData;
};

export const EcfTable = ({ base64ExcelFile }: EcfTableProps) => {
  const [tableData, setTableData] = useState<ExcelData>([]);
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    if (!base64ExcelFile) return;

    const data = parseExcel(base64ExcelFile);
    if (data.length > 0) {
      setTableData(data);
      setColumns(Object.keys(data[0])); // Extract column headers
    }
  }, [base64ExcelFile]);

  return (
    <Box maxHeight="400px" overflowY="auto" tabIndex={0}>
      <Table
        variant="simple"
        sx={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}
      >
        <Thead>
          <Tr>
            {columns.map((col, index) => (
              <Th
                key={index}
                position="sticky"
                top={0}
                zIndex={1}
                backgroundColor="#F5F7FA"
                border="2px solid #EDF0F5"
                textTransform="none"
              >
                {col}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {tableData.map((row, rowIndex) => (
            <Tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <Td key={colIndex} border="2px solid #EDF0F5">
                  {row[col] || ''}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};
