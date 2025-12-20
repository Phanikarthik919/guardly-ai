import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? data.map(item => item.id) : []);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(
        checked 
          ? [...selectedIds, id]
          : selectedIds.filter(selectedId => selectedId !== id)
      );
    }
  };

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  if (data.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {selectable && (
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "opacity-50" : ""}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.key as string}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow 
              key={item.id}
              className={selectedIds.includes(item.id) ? "bg-primary/5" : ""}
            >
              {selectable && (
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={(checked) => handleSelectRow(item.id, !!checked)}
                    aria-label={`Select row ${item.id}`}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.key as string}>
                  {column.render 
                    ? column.render(item)
                    : (item[column.key as keyof T] as React.ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    compliant: { variant: "default", className: "bg-success text-success-foreground" },
    violation: { variant: "destructive" },
    warning: { variant: "default", className: "bg-warning text-warning-foreground" },
    missing_docs: { variant: "secondary" },
    low: { variant: "default", className: "bg-success text-success-foreground" },
    medium: { variant: "default", className: "bg-warning text-warning-foreground" },
    high: { variant: "destructive" },
  };

  const config = variants[status] || { variant: "secondary" as const };

  return (
    <Badge variant={config.variant} className={config.className}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
