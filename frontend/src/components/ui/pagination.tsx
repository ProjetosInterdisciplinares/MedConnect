import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {

  // se tiver só uma pagina, nao aparece esse componente
  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages: (number | string)[] = [];

    // se tiver 5 paginas ou menos mostra todas
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // caso 1: perto do inicio (ex: pagina 1 de 10 -> 1 2 3 4 ... 10)
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      }
      // caso 2: Pperto do fim das paginas totais(ex: pagina 10 de 10 -> 1 ... 7 8 9 10)
      else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      }
      // caso 3: no meio da quantidade de paginas (ex: pagina 4 de 10 -> 1 ... 3 [4] 5 ... 10)
      else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }

    return pages;
  };

  const pages = generatePages();

  return (
    <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm my-3 ">
      
      {/* modo mobile*/}
      <div className="flex flex-1 justify-between items-center sm:hidden gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-7 px-2.5 text-xs rounded-lg"
        >
          Anterior
        </Button>
        <span className="text-xs font-semibold text-slate-600">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="h-7 px-2.5 text-xs rounded-lg"
        >
          Próxima
        </Button>
      </div>

      {/* modo desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500">
            Exibindo <span className="font-semibold text-slate-600">{(currentPage - 1) * itemsPerPage + 1}</span> a{" "}
            <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de{" "}
            <span className="font-semibold text-slate-700">{totalItems}</span> resultados
          </p>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-7 px-2 text-xs rounded-lg text-slate-600 hover:bg-slate-50 gap-0.5 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Anterior
          </Button>
          
          {/* renderizacao dinamica das paginas */}
          {pages.map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="text-xs font-medium text-slate-400 px-1 select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;

            return (
              <Button
                key={`page-${page}`}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={`h-7 w-7 p-0 text-xs rounded-lg font-medium transition-colors ${
                  isCurrent 
                    ? "bg-sky-700 text-white hover:bg-sky-800" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {page}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="h-7 px-2 text-xs rounded-lg text-slate-600 hover:bg-slate-50 gap-0.5 transition-colors"
          >
            Próxima
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}