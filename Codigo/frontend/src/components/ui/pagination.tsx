import React from "react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const pages = generatePages();

  return (
    <div className={`w-full flex items-center justify-between bg-surface px-6 py-4 rounded-xl border border-border/60 shadow-sm overflow-x-auto ${className || ""}`}>
      
      {/* Controles da Esquerda */}
      <div className="flex items-center gap-4 sm:gap-8 min-w-max">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="cursor-pointer text-[15px] font-bold text-brand-header disabled:opacity-50 disabled:cursor-not-allowed hover:text-brand-hover transition-colors"
        >
          &lt; Anterior
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          {pages.map((page, index) => {
            if (page === "...") {
              return <span key={`ellipsis-${index}`} className="text-[15px] text-slate-400">...</span>
            }

            const isCurrent = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page as number)}
                className={`cursor-pointer text-[15px] font-medium transition-colors w-5 h-7 flex items-center justify-center ${
                  isCurrent 
                    ? "text-brand font-bold border-b-2 border-brand" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="cursor-pointer text-[15px] font-bold text-brand-header disabled:opacity-50 disabled:cursor-not-allowed hover:text-brand-hover transition-colors"
        >
          Próxima &gt;
        </button>
      </div>

      {/* Texto da Direita */}
      <div className="text-[14px] font-semibold text-slate-400 hidden sm:block ml-4">
        Mostrando {Math.min(itemsPerPage, totalItems - (currentPage - 1) * itemsPerPage)} de {totalItems} anúncios
      </div>
    </div>
  );
}