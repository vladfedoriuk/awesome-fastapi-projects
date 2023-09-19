"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { useVirtual } from "@tanstack/react-virtual";
import { useDependenciesOrama } from "@/lib/search";
import { search } from "@orama/orama";
import { Dependency } from "@/lib/schemas";

export function MultiSelect<DataType extends { id: string; name: string }>({
  data,
}: {
  data: DataType[];
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const scrollableContainerRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DataType[]>([]);
  const [selectables, setSelectables] = React.useState<DataType[]>(data);
  const [inputValue, setInputValue] = React.useState("");
  const dependenciesOrama = useDependenciesOrama();

  const onChangeInputValue = async (dependencyName: string) => {
    if (!dependenciesOrama.isIndexed || !dependenciesOrama.orama) {
      throw new Error("Dependencies Orama is not initialized");
    }
    const results = await search<Dependency>(dependenciesOrama.orama, {
      term: dependencyName,
      properties: ["name"],
      limit: data.length,
    });
    setSelectables(
      results.hits
        .map((hit) => hit.document as DataType)
        .filter((dataPoint) => !selected.includes(dataPoint)),
    );
    setInputValue(dependencyName);
  };

  const rowVirtualizer = useVirtual({
    size: selectables.length,
    parentRef: scrollableContainerRef,
    overscan: 10,
  });

  const handleUnselect = React.useCallback((dataPoint: DataType) => {
    setSelected((prev) => prev.filter((el) => el.id !== dataPoint.id));
    setSelectables((prev) => [dataPoint, ...prev]);
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            setSelected((prev) => {
              const newSelected = [...prev];
              newSelected.pop();
              return newSelected;
            });
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [],
  );

  return (
    <Command
      onKeyDown={handleKeyDown}
      className="overflow-visible bg-transparent"
    >
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex gap-1 flex-wrap">
          {selected.map((dataPoint) => {
            return (
              <Badge key={dataPoint.id} variant="secondary">
                {dataPoint.name}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(dataPoint);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(dataPoint)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          {/* Avoid having the "Search" Icon */}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={onChangeInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder="Select..."
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 ? (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup
              ref={scrollableContainerRef}
              className="h-96 overflow-auto"
            >
              <div
                style={{
                  height: `${rowVirtualizer.totalSize}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.virtualItems.map((virtualRow) => (
                  <CommandItem
                    key={virtualRow.index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={(value) => {
                      setInputValue("");
                      setSelected((prev) => [
                        ...prev,
                        selectables[virtualRow.index],
                      ]);
                      setSelectables((prev) =>
                        prev.filter((_, index) => index !== virtualRow.index),
                      );
                    }}
                    className="cursor-pointer"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {selectables[virtualRow.index].name}
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  );
}