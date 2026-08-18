'use client';

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, CircleHelp, LoaderCircle, Search, TriangleAlert, X } from 'lucide-react';
import { z } from 'zod';

import useCurrentUser from '@/hooks/useCurrentUser';
import {
  createSalesIntention,
  fetchSalesIntentionClassificacoes,
  fetchSalesIntentionCatalogs,
  fetchSalesIntentionModelosDealer,
  lookupSalesIntentionModelosDealerByPlate,
  formatSalesIntentionApiError,
  type SalesIntentionCatalogResponse,
  type SalesIntentionCatalogHierarchyRecord,
  type SalesIntentionCatalogSources,
  type SalesIntentionModelosDealerResponse,
  type SalesIntentionModelosDealerRecord,
  type SalesIntentionModelosDealerSources
} from '@/lib/salesIntentionApi';
import type { SalesIntentionPayload } from '@/types/types';

const emptyCatalogSources: SalesIntentionCatalogSources = {
  tipoVenda: [],
  bandeira: [],
  regional: [],
  lojaVenda: []
};

const emptyCatalogHierarchy: SalesIntentionCatalogHierarchyRecord[] = [];

const emptyModelosDealerSources: SalesIntentionModelosDealerSources = {
  tipoVenda: [],
  marca: [],
  modelo: [],
  versaoModelo: []
};

const emptyVehicleCatalogRows: SalesIntentionModelosDealerRecord[] = [];

const tipoVendaLabels: Record<string, string> = {
  NOVOS: 'Novos',
  SEMINOVOS: 'Seminovos'
};

const initialValues: SalesIntentionPayload = {
  proprietario: '',
  tipoVenda: '',
  bandeira: '',
  lojaVenda: '',
  marcaVeiculo: '',
  versao: '',
  classificacao: '',
  quantidade: 1,
  dataSolicitacao: '',
  placa: '',
  regional: ''
};

type SalesIntentionFormData = SalesIntentionPayload & {
  ano: string;
  modelo: string;
};

type FormErrors = Partial<Record<keyof SalesIntentionFormData, string>>;

type NotificationVariant = 'success' | 'error' | 'warning' | 'loading';

type NotificationState = {
  open: boolean;
  variant: NotificationVariant;
  title: string;
  description: string;
};

const defaultNotification: NotificationState = {
  open: false,
  variant: 'success',
  title: '',
  description: ''
};

const MAX_NOTIFICATION_DESCRIPTION_LENGTH = 160;

function normalizeValue(value: string) {
  return value.trim().toUpperCase();
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatTipoVendaLabel(value: string) {
  return tipoVendaLabels[normalizeValue(value)] ?? value;
}

function clampNotificationDescription(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= MAX_NOTIFICATION_DESCRIPTION_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_NOTIFICATION_DESCRIPTION_LENGTH - 3).trimEnd()}...`;
}

function getNotificationDescription(error: unknown) {
  return clampNotificationDescription(formatSalesIntentionApiError(error));
}

function isTipoVenda(value: string, expected: 'NOVOS' | 'SEMINOVOS') {
  return normalizeValue(value) === expected;
}

function getCurrentDateTimeInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toApiDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function buildFormSchema(currentOwner: string) {
  return z
    .object({
      proprietario: z
        .string()
        .trim()
        .min(1, 'O usuário logado será preenchido automaticamente neste campo.')
        .refine((value) => normalizeValue(value) === normalizeValue(currentOwner), {
          message: 'Confirme se o usuário logado foi carregado corretamente.'
        }),
      tipoVenda: z.string().trim().min(1, 'Escolha o tipo de venda.'),
      bandeira: z.string().trim().min(1, 'Escolha a bandeira.'),
      lojaVenda: z.string().trim().min(1, 'Escolha a loja de venda.'),
      marcaVeiculo: z.string().trim().min(1, 'Escolha a marca do veículo.'),
      versao: z.string().trim().min(1, 'Escolha a versão.'),
      classificacao: z.string().trim().min(1, 'Escolha a classificação.'),
      quantidade: z.number().int('Informe uma quantidade inteira.').min(1, 'A quantidade precisa ser de pelo menos 1.'),
      dataSolicitacao: z
        .string()
        .trim()
        .regex(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
          'Informe a data e a hora da solicitação.'
        )
        .refine((value) => Boolean(toApiDateTime(value)), {
          message: 'Informe uma data e hora válidas.'
        }),
      placa: z.string().trim().min(1, 'Informe a placa do veículo.'),
      regional: z.string().trim().min(1, 'Escolha a regional.'),
      ano: z.string().trim(),
      modelo: z.string().trim().min(1, 'Escolha o modelo do veículo.')
    })
    .superRefine((data, ctx) => {
      if (isTipoVenda(data.tipoVenda, 'NOVOS') && data.placa !== '-') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['placa'],
          message: 'Para veículos novos, preencha a placa com -.'
        });
      }

      if (isTipoVenda(data.tipoVenda, 'SEMINOVOS') && !isBrazilPlate(data.placa)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['placa'],
          message: 'Para seminovos, informe a placa no formato AAA-1234.'
        });
      }

      if (isTipoVenda(data.tipoVenda, 'SEMINOVOS') && !data.ano) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ano'],
          message: 'Escolha o ano do veículo.'
        });
      }
    });
}

function getFilteredOptions(
  sourceKey: string,
  filters: Record<string, string>,
  sourceRows: Array<Record<string, string>>
) {
  return Array.from(
    new Set(
      sourceRows
        .filter((item) =>
          Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            return normalizeValue(String(item[key] ?? '')) === normalizeValue(value);
          })
        )
        .map((item) => String(item[sourceKey] ?? '').trim())
        .filter(Boolean)
    )
  ).sort();
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const firstYear = 1950;
  return Array.from({ length: currentYear - firstYear + 2 }, (_, index) =>
    String(currentYear + 1 - index)
  );
}

function formatBrazilPlateInput(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (cleaned.length <= 3) {
    return cleaned;
  }

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

function normalizePlateLookupValue(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isBrazilPlate(value: string) {
  return /^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(value.trim().toUpperCase());
}

function FieldTooltip({
  text,
  placement = 'top'
}: {
  text: string;
  placement?: 'top' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipPositionClasses =
    placement === 'right'
      ? 'left-full top-0 ml-2 -translate-x-0'
      : 'bottom-full left-1/2 mb-2 -translate-x-1/2';

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={text}
        aria-expanded={isOpen}
        className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 dark:text-slate-500 dark:hover:text-cyan-300"
        onClick={() => setIsOpen((current) => !current)}
        onBlur={() => setIsOpen(false)}
      >
        <CircleHelp className="h-4 w-4" />
        <span
          className={`pointer-events-none absolute z-20 w-64 max-w-[calc(100vw-2rem)] whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-left text-xs leading-5 text-white shadow-xl transition duration-150 dark:border-white/10 dark:bg-slate-900 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          } ${tooltipPositionClasses}`}
        >
          {text}
        </span>
      </button>
    </span>
  );
}

function FieldLabelWithTooltip({
  label,
  tooltip,
  tooltipPlacement = 'top'
}: {
  label: string;
  tooltip: string;
  tooltipPlacement?: 'top' | 'right';
}) {
  return (
    <span className={fieldLabelRowClasses}>
      <span className={fieldLabelTextClasses}>{label}</span>
      <FieldTooltip text={tooltip} placement={tooltipPlacement} />
    </span>
  );
}

const fieldLabelRowClasses = 'inline-flex flex-wrap items-center gap-x-1.5 gap-y-1';
const fieldLabelTextClasses =
  'min-w-0 text-base font-extrabold leading-tight tracking-[-0.02em] text-slate-950 dark:text-slate-50 sm:text-[1.0rem]';
function FieldLabel({
  label
}: {
  label: string;
}) {
  return <span className={fieldLabelTextClasses}>{label}</span>;
}

function SearchableField({
  label,
  tooltip,
  tooltipPlacement = 'top',
  value,
  options,
  placeholder,
  disabled = false,
  error,
  onSelect
}: {
  label: string;
  tooltip: string;
  tooltipPlacement?: 'top' | 'right';
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  onSelect: (value: string) => void;
}) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);

  useEffect(() => {
    setQuery(value);
    setIsOpen(false);
    setShowAllOptions(false);
  }, [value]);

  const normalizedQuery = normalizeSearchValue(query);
  const filteredOptions = useMemo(() => {
    if (!isOpen) {
      return [];
    }

    if (showAllOptions || normalizedQuery.length === 0) {
      return options;
    }

    return options.filter((option) => normalizeSearchValue(option).includes(normalizedQuery));
  }, [isOpen, normalizedQuery, options, showAllOptions]);

  const showDropdown = !disabled && isOpen;

  const selectOption = (option: string) => {
    setQuery(option);
    setIsOpen(false);
    setShowAllOptions(false);
    onSelect(option);
  };

  const handleFocus = () => {
    if (disabled) return;

    setIsOpen(true);
    setShowAllOptions(true);
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  };

  return (
    <label className={labelClasses}>
      <FieldLabelWithTooltip
        label={label}
        tooltip={tooltip}
        tooltipPlacement={tooltipPlacement}
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onFocus={handleFocus}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setShowAllOptions(false);
            setIsOpen(true);
          }}
          onBlur={() => {
            setIsOpen(false);
            setShowAllOptions(false);
            setQuery(value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setIsOpen(false);
              setShowAllOptions(false);
              setQuery(value);
              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              if (filteredOptions.length === 1) {
                selectOption(filteredOptions[0]);
              }
            }
          }}
          placeholder={placeholder}
          className={`${fieldClasses} pl-12 sm:pl-12`}
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          autoComplete="off"
        />

        {showDropdown ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-30 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700 focus-visible:bg-sky-50 focus-visible:text-sky-700 focus-visible:outline-none dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-cyan-300 dark:focus-visible:bg-white/5 dark:focus-visible:text-cyan-300"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    selectOption(option);
                  }}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                Nenhuma opção encontrada.
              </div>
            )}
          </div>
        ) : null}
      </div>
      {error ? <span className={errorTextClasses}>{error}</span> : null}
    </label>
  );
}

const fieldClasses =
  'min-h-12 w-full min-w-0 rounded-2xl border border-slate-300/80 bg-white px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 outline-none ring-1 ring-transparent transition duration-150 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-80 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/10 dark:disabled:bg-slate-900/80 sm:min-h-14 sm:rounded-3xl sm:px-4 sm:py-3 sm:text-base';

const labelClasses = 'flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300';
const errorTextClasses = 'text-xs text-rose-600 dark:text-rose-300';
const pageCardClasses =
  'mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200/60 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/50 sm:rounded-[32px] dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.32)] dark:ring-white/5';
const headerCardClasses =
  'border-b border-slate-200/70 bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 p-4 text-white sm:p-6 dark:border-white/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700';
const notificationBackdropClasses =
  'fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-6';
const notificationCardBaseClasses =
  'w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-900 dark:text-slate-100';
const notificationFooterClasses =
  'flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-white/5';

const MIN_FEEDBACK_LOADING_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SalesIntentionForm() {
  const { user, loading: isUserLoading } = useCurrentUser();
  const [formData, setFormData] = useState<SalesIntentionFormData>({
    ...initialValues,
    dataSolicitacao: getCurrentDateTimeInputValue(),
    ano: '',
    modelo: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [catalogData, setCatalogData] = useState<SalesIntentionCatalogResponse | null>(null);
  const [vehicleCatalogData, setVehicleCatalogData] = useState<SalesIntentionModelosDealerResponse | null>(null);
  const [classificacaoViewOptions, setClassificacaoViewOptions] = useState<string[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isVehicleCatalogLoading, setIsVehicleCatalogLoading] = useState(true);
  const [isClassificacaoLoading, setIsClassificacaoLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>(defaultNotification);
  const yearOptions = useMemo(() => getYearOptions(), []);
  const lastPlateLookupRef = useRef('');

  const openNotification = (variant: NotificationVariant, title: string, description: string) => {
    setNotification({
      open: true,
      variant,
      title,
      description: clampNotificationDescription(description)
    });
  };

  useEffect(() => {
    let active = true;

    async function loadCatalogRows() {
      setIsCatalogLoading(true);
      setIsVehicleCatalogLoading(true);
      setIsClassificacaoLoading(true);
      try {
        const [rows, vehicleRows, classificacaoRows] = await Promise.allSettled([
          fetchSalesIntentionCatalogs(),
          fetchSalesIntentionModelosDealer(),
          fetchSalesIntentionClassificacoes()
        ]);
        if (!active) return;
        if (rows.status === 'fulfilled') {
          setCatalogData(rows.value);
        }

        if (vehicleRows.status === 'fulfilled') {
          setVehicleCatalogData(vehicleRows.value);
        }

        if (classificacaoRows.status === 'fulfilled') {
          setClassificacaoViewOptions(classificacaoRows.value);
        } else {
          setClassificacaoViewOptions([]);
        }

        if (rows.status === 'rejected' || vehicleRows.status === 'rejected' || classificacaoRows.status === 'rejected') {
          openNotification(
            'error',
            'Não conseguimos carregar os campos',
            'Não conseguimos carregar os campos do formulário no momento.'
          );
        }
      } finally {
        if (active) {
          setIsCatalogLoading(false);
          setIsVehicleCatalogLoading(false);
          setIsClassificacaoLoading(false);
        }
      }
    }

    void loadCatalogRows();

    return () => {
      active = false;
    };
  }, []);

  const anoOptions = yearOptions;

  const currentOwner = useMemo(() => {
    const userEmail = user?.email?.trim() ?? '';
    const userName = user?.name?.trim() ?? '';
    return userEmail || userName;
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (!currentOwner) return;

    setFormData((current) =>
      current.proprietario === currentOwner ? current : { ...current, proprietario: currentOwner }
    );
  }, [currentOwner]);

  useEffect(() => {
    if (!notification.open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [notification.open]);

  useEffect(() => {
    setFormData((current) => {
      if (isTipoVenda(current.tipoVenda, 'NOVOS') && current.placa !== '-') {
        return { ...current, placa: '-', ano: '', marcaVeiculo: '', modelo: '', versao: '' };
      }

      if (isTipoVenda(current.tipoVenda, 'SEMINOVOS') && current.placa === '-') {
        return { ...current, placa: '', marcaVeiculo: '', modelo: '', versao: '' };
      }

      return current;
    });
  }, [formData.tipoVenda]);

  const catalogSources = catalogData?.sources ?? emptyCatalogSources;
  const vehicleCatalogSources = vehicleCatalogData?.sources ?? emptyModelosDealerSources;
  const catalogHierarchy = catalogData?.hierarchy ?? emptyCatalogHierarchy;
  const vehicleCatalogRows = vehicleCatalogData?.combinations ?? emptyVehicleCatalogRows;

  const filteredOptions = useMemo(
    () => ({
      tipoVenda: (vehicleCatalogSources.tipoVenda.length > 0
        ? vehicleCatalogSources.tipoVenda
        : catalogSources.tipoVenda
      ).map((value) => ({
        value,
        label: formatTipoVendaLabel(value)
      })),
      bandeira: catalogSources.bandeira,
      regional: getFilteredOptions(
        'regional',
        {
          bandeira: formData.bandeira
        },
        catalogHierarchy
      ),
      lojaVenda: formData.regional
        ? getFilteredOptions(
            'lojaVenda',
            {
              bandeira: formData.bandeira,
              regional: formData.regional
            },
            catalogHierarchy
          )
        : [],
      marcaVeiculo: formData.tipoVenda
        ? getFilteredOptions(
            'marca',
            {
              tipoVenda: formData.tipoVenda
            },
            vehicleCatalogRows
          )
        : [],
      modelo: formData.marcaVeiculo
        ? getFilteredOptions(
            'modelo',
            {
              tipoVenda: formData.tipoVenda,
              marca: formData.marcaVeiculo
            },
            vehicleCatalogRows
          )
        : [],
      versao: formData.marcaVeiculo && formData.modelo
        ? getFilteredOptions(
            'versaoModelo',
            {
              tipoVenda: formData.tipoVenda,
              marca: formData.marcaVeiculo,
              modelo: formData.modelo
            },
            vehicleCatalogRows
          )
        : [],
      classificacao: classificacaoViewOptions
    }),
    [
      catalogHierarchy,
      catalogSources,
      formData.bandeira,
      formData.marcaVeiculo,
      formData.modelo,
      formData.regional,
      formData.tipoVenda,
      classificacaoViewOptions,
      vehicleCatalogRows,
      vehicleCatalogSources
    ]
  );

  const regionalTooltipText = formData.bandeira
    ? 'As regionais são filtradas pela bandeira selecionada.'
    : 'Escolha a bandeira para liberar as regionais.';
  const lojaVendaTooltipText = formData.regional
    ? 'As lojas são filtradas pela regional selecionada.'
    : 'Escolha a regional para liberar as lojas.';
  const vehicleTooltipText = isTipoVenda(formData.tipoVenda, 'NOVOS')
    ? 'Mostrando apenas veículos zero quilômetro.'
    : isTipoVenda(formData.tipoVenda, 'SEMINOVOS')
      ? 'Mostrando apenas veículos seminovos.'
      : 'Escolha o tipo de venda para liberar os veículos.';
  const modelTooltipText = formData.marcaVeiculo
    ? 'Os modelos são filtrados pela marca selecionada.'
    : 'Escolha a marca para liberar os modelos.';
  const versionTooltipText = formData.modelo
    ? 'As versões são filtradas pelo modelo selecionado.'
    : 'Escolha o modelo\npara liberar as versões.';
  const showSeminovosFields = isTipoVenda(formData.tipoVenda, 'SEMINOVOS');

  useEffect(() => {
    if (!showSeminovosFields) {
      lastPlateLookupRef.current = '';
      return;
    }

    const currentPlate = formData.placa.trim();
    if (!isBrazilPlate(currentPlate)) {
      lastPlateLookupRef.current = '';
      return;
    }

    const normalizedPlate = normalizePlateLookupValue(currentPlate);
    if (!normalizedPlate || lastPlateLookupRef.current === normalizedPlate) {
      return;
    }

    lastPlateLookupRef.current = normalizedPlate;
    let active = true;

    void (async () => {
      try {
        const match = await lookupSalesIntentionModelosDealerByPlate(currentPlate);
        if (!active || !match) {
          return;
        }

        const hasMarcaVeiculo = Boolean(match.marcaVeiculo?.trim());
        const hasModelo = Boolean(match.modelo?.trim());
        const hasVersao = Boolean(match.versao?.trim());
        const hasAno = Boolean(String(match.ano ?? '').trim());

        setFormData((current) => {
          if (normalizePlateLookupValue(current.placa) !== normalizedPlate) {
            return current;
          }

          return {
            ...current,
            marcaVeiculo: hasMarcaVeiculo ? match.marcaVeiculo?.trim() ?? current.marcaVeiculo : current.marcaVeiculo,
            modelo: hasModelo ? match.modelo?.trim() ?? current.modelo : current.modelo,
            versao: hasVersao ? match.versao?.trim() ?? current.versao : current.versao,
            ano: hasAno ? String(match.ano) : current.ano
          };
        });

        setErrors((current) => ({
          ...current,
          ...(hasMarcaVeiculo ? { marcaVeiculo: undefined } : {}),
          ...(hasModelo ? { modelo: undefined } : {}),
          ...(hasVersao ? { versao: undefined } : {}),
          ...(hasAno ? { ano: undefined } : {})
        }));
      } catch {
        // Keep the form usable even if the lookup endpoint is unavailable.
      }
    })();

    return () => {
      active = false;
    };
  }, [formData.placa, showSeminovosFields]);

  const closeNotification = () => setNotification(defaultNotification);
  const isOptionsLoading = isCatalogLoading || isVehicleCatalogLoading || isClassificacaoLoading;

  const updateFormField = (name: keyof SalesIntentionFormData, rawValue: string) => {
    const nextValue =
      name === 'quantidade'
        ? Number(rawValue)
        : name === 'placa'
          ? formatBrazilPlateInput(rawValue)
          : rawValue;

    setFormData((current) => {
      const nextFormData = {
        ...current,
        [name]: nextValue,
        ...(name === 'tipoVenda'
          ? isTipoVenda(String(nextValue), 'NOVOS')
            ? { placa: '-', ano: '', marcaVeiculo: '', modelo: '', versao: '' }
            : { placa: '', ano: '', marcaVeiculo: '', modelo: '', versao: '' }
          : {}),
        ...(name === 'marcaVeiculo' ? { modelo: '', versao: '' } : {}),
        ...(name === 'modelo' ? { versao: '' } : {}),
        ...(name === 'bandeira' ? { regional: '', lojaVenda: '' } : {}),
        ...(name === 'regional' ? { lojaVenda: '' } : {})
      };

      return nextFormData;
    });

    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === 'tipoVenda'
        ? { placa: undefined, ano: undefined, marcaVeiculo: undefined, modelo: undefined, versao: undefined }
        : {}),
      ...(name === 'bandeira' ? { regional: undefined, lojaVenda: undefined } : {}),
      ...(name === 'regional' ? { lojaVenda: undefined } : {}),
      ...(name === 'marcaVeiculo' ? { modelo: undefined, versao: undefined } : {}),
      ...(name === 'modelo' ? { versao: undefined } : {})
    }));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    updateFormField(name as keyof SalesIntentionFormData, value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const formSchema = buildFormSchema(currentOwner);
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = result.error.issues.reduce<FormErrors>((acc, issue) => {
        const field = issue.path[0] as keyof SalesIntentionFormData;
        if (field) acc[field] = issue.message;
        return acc;
      }, {});

      setErrors(fieldErrors);
      openNotification(
        'warning',
        'Revise os campos destacados',
        'Há informações obrigatórias que ainda precisam ser preenchidas.'
      );
      return;
    }

    const submitStartedAt = Date.now();
    setIsLoading(true);
    openNotification(
      'loading',
      'Salvando sua solicitação',
      'Estamos registrando sua intenção. Aguarde um instante.'
    );

    try {
      const { ano, modelo, ...payload } = result.data;
      await createSalesIntention({
        ...payload,
        dataSolicitacao: toApiDateTime(payload.dataSolicitacao),
        modelo,
        ano_fabricacao: ano ? Number(ano) : null,
        ano_modelo: ano ? Number(ano) : null
      });

      const elapsed = Date.now() - submitStartedAt;
      if (elapsed < MIN_FEEDBACK_LOADING_MS) {
        await wait(MIN_FEEDBACK_LOADING_MS - elapsed);
      }

      setFormData({
        ...initialValues,
        dataSolicitacao: getCurrentDateTimeInputValue(),
        ano: '',
        modelo: '',
        proprietario: currentOwner
      });
      openNotification(
        'success',
        'Intenção registrada',
        'Sua solicitação foi enviada com sucesso.'
      );
    } catch (error) {
      const elapsed = Date.now() - submitStartedAt;
      if (elapsed < MIN_FEEDBACK_LOADING_MS) {
        await wait(MIN_FEEDBACK_LOADING_MS - elapsed);
      }

      openNotification(
        'error',
        'Não conseguimos enviar',
        getNotificationDescription(error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnerLocked = isUserLoading || !currentOwner;
  const notificationTone = notification.variant === 'success'
    ? {
        container: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-50',
        pill: 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950',
        icon: CheckCircle2,
        iconClass: 'text-emerald-600 dark:text-emerald-400'
      }
    : notification.variant === 'warning'
      ? {
          container: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-50',
          pill: 'bg-amber-600 text-white dark:bg-amber-400 dark:text-slate-950',
          icon: TriangleAlert,
          iconClass: 'text-amber-600 dark:text-amber-400'
        }
      : notification.variant === 'loading'
        ? {
            container: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-50',
            pill: 'bg-sky-600 text-white dark:bg-sky-400 dark:text-slate-950',
            icon: LoaderCircle,
            iconClass: 'text-sky-600 animate-spin dark:text-sky-400'
          }
        : {
            container: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-50',
            pill: 'bg-rose-600 text-white dark:bg-rose-400 dark:text-slate-950',
            icon: AlertCircle,
            iconClass: 'text-rose-600 dark:text-rose-400'
          };
  const NotificationIcon = notificationTone.icon;
  const notificationEyebrow =
    notification.variant === 'success'
      ? 'Tudo certo'
      : notification.variant === 'warning'
        ? 'Atenção'
        : notification.variant === 'loading'
          ? 'Salvando'
          : 'Ops';

  return (
    <section className={pageCardClasses}>
      <div className={headerCardClasses}>
        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/90">
          Formulário
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Venda Cantada</h1>

      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-5 md:grid-cols-2 xl:grid-cols-12"
      >
        <div className="grid gap-3 sm:gap-4 md:col-span-2 xl:col-span-8">
          <label className={labelClasses}>
            <FieldLabel label="Proprietário" />
            <input
              name="proprietario"
              value={formData.proprietario}
              readOnly
              placeholder={isOwnerLocked ? 'Carregando usuário logado...' : ''}
              className={fieldClasses}
              disabled={isLoading || isOwnerLocked}
            />
            {errors.proprietario ? <span className={errorTextClasses}>{errors.proprietario}</span> : null}
          </label>
        </div>

        <div className="grid gap-3 sm:gap-4 xl:col-span-4">
          <label className={labelClasses}>
            <FieldLabel label="Tipo de venda" />
            <select
              name="tipoVenda"
              value={formData.tipoVenda}
              onChange={handleChange}
              className={fieldClasses}
              disabled={isLoading || isOptionsLoading}
            >
              <option value="">Escolha o tipo</option>
              {filteredOptions.tipoVenda.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.tipoVenda ? <span className={errorTextClasses}>{errors.tipoVenda}</span> : null}
          </label>
        </div>

        <div className="grid gap-3 sm:gap-4 xl:col-span-3">
          <label className={labelClasses}>
            <FieldLabel label="Bandeira" />
            <select
              name="bandeira"
              value={formData.bandeira}
              onChange={handleChange}
              className={fieldClasses}
              disabled={isLoading || isOptionsLoading}
            >
              <option value="">Escolha a bandeira</option>
              {filteredOptions.bandeira.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {errors.bandeira ? <span className={errorTextClasses}>{errors.bandeira}</span> : null}
          </label>
        </div>

        <div className="grid gap-3 sm:gap-4 xl:col-span-4">
          <label className={labelClasses}>
            <FieldLabelWithTooltip
              label="Regional"
              tooltip={regionalTooltipText}
            />
            <select
              name="regional"
              value={formData.regional}
              onChange={handleChange}
              className={fieldClasses}
              disabled={isLoading || isOptionsLoading || !formData.bandeira}
            >
              <option value="">
                {formData.bandeira ? 'Escolha a regional' : 'Escolha a bandeira primeiro'}
              </option>
              {filteredOptions.regional.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {errors.regional ? <span className={errorTextClasses}>{errors.regional}</span> : null}
          </label>
        </div>

        <div className="grid gap-3 sm:gap-4 xl:col-span-5">
          <SearchableField
            label="Loja de Venda"
            tooltip={lojaVendaTooltipText}
            value={formData.lojaVenda}
            options={filteredOptions.lojaVenda}
            placeholder={formData.regional ? 'Digite 1 caractere para buscar' : 'Escolha a regional primeiro'}
            disabled={isLoading || isOptionsLoading || !formData.regional}
            error={errors.lojaVenda}
            onSelect={(nextValue) => updateFormField('lojaVenda', nextValue)}
          />
        </div>

        <div
          className={
            showSeminovosFields
              ? 'grid gap-3 sm:gap-4 md:col-span-2 md:grid-cols-3 xl:col-span-12 xl:grid-cols-12'
              : 'grid gap-3 sm:gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-12 xl:grid-cols-12'
          }
        >
          {showSeminovosFields ? (
            <label className={`${labelClasses} md:col-span-1 xl:col-span-2`}>
              <FieldLabel label="Placa" />
              <input
                type="text"
                name="placa"
                value={formData.placa}
                onChange={handleChange}
                className={fieldClasses}
                disabled={isLoading}
                placeholder="AAA-1234"
                maxLength={8}
                inputMode="text"
                autoComplete="off"
              />
              {errors.placa ? <span className={errorTextClasses}>{errors.placa}</span> : null}
            </label>
          ) : null}

          <div className="grid gap-3 sm:gap-4 md:col-span-1 xl:col-span-4">
            <SearchableField
              label="Marca veículo"
              tooltip={vehicleTooltipText}
              value={formData.marcaVeiculo}
              options={filteredOptions.marcaVeiculo}
              placeholder={formData.tipoVenda ? 'Digite 1 caractere para buscar' : 'Escolha o tipo de venda primeiro'}
              disabled={isLoading || isOptionsLoading || !formData.tipoVenda}
              error={errors.marcaVeiculo}
              onSelect={(nextValue) => updateFormField('marcaVeiculo', nextValue)}
            />
          </div>

          <div
            className={
              showSeminovosFields
                ? 'grid gap-3 sm:gap-4 md:col-span-1 xl:col-span-6'
                : 'grid gap-3 sm:gap-4 md:col-span-1 xl:col-span-8'
            }
          >
            <SearchableField
              label="Modelo"
              tooltip={modelTooltipText}
              value={formData.modelo}
              options={filteredOptions.modelo}
              placeholder={formData.marcaVeiculo ? 'Digite 1 caractere para buscar' : 'Escolha a marca primeiro'}
              disabled={isLoading || isOptionsLoading || !formData.marcaVeiculo}
              error={errors.modelo}
              onSelect={(nextValue) => updateFormField('modelo', nextValue)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:col-span-2 xl:col-span-12 pr-4">
          <SearchableField
            label="Versão"
            tooltip={versionTooltipText}
            tooltipPlacement="right"
            value={formData.versao}
            options={filteredOptions.versao}
            placeholder={
              formData.marcaVeiculo
                ? formData.modelo
                  ? 'Digite 1 caractere para buscar'
                  : 'Escolha o modelo primeiro'
                : 'Escolha a marca primeiro'
            }
            disabled={isLoading || isOptionsLoading || !formData.marcaVeiculo || !formData.modelo}
            error={errors.versao}
            onSelect={(nextValue) => updateFormField('versao', nextValue)}
          />
        </div>

        {showSeminovosFields ? (
          <>
            <div className="grid gap-3 sm:gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-12 xl:grid-cols-12">
              <label className={`${labelClasses} md:col-span-1 xl:col-span-3`}>
                <FieldLabel label="Ano" />
                <select
                  name="ano"
                  value={formData.ano}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                >
                  <option value="">Selecione o ano</option>
                  {anoOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {errors.ano ? <span className={errorTextClasses}>{errors.ano}</span> : null}
              </label>
              <label className={`${labelClasses} md:col-span-1 xl:col-span-4`}>
                <FieldLabel label="Classificação" />
                <select
                  name="classificacao"
                  value={formData.classificacao}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                >
                  <option value="">Escolha a classificação</option>
                  {filteredOptions.classificacao.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {errors.classificacao ? <span className={errorTextClasses}>{errors.classificacao}</span> : null}
              </label>

              <label className={`${labelClasses} md:col-span-1 xl:col-span-2`}>
                <FieldLabel label="Quant." />
                <input
                  type="number"
                  min={1}
                  name="quantidade"
                  value={formData.quantidade}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                />
                {errors.quantidade ? <span className={errorTextClasses}>{errors.quantidade}</span> : null}
              </label>

              <label className={`${labelClasses} md:col-span-1 xl:col-span-3`}>
                <FieldLabel label="Data e hora da solic" />
                <input
                  type="datetime-local"
                  step={60}
                  name="dataSolicitacao"
                  value={formData.dataSolicitacao}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                />
                {errors.dataSolicitacao ? <span className={errorTextClasses}>{errors.dataSolicitacao}</span> : null}
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-4 md:col-span-2 xl:col-span-4">
              <label className={labelClasses}>
                <FieldLabel label="Classificação" />
                <select
                  name="classificacao"
                  value={formData.classificacao}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                >
                  <option value="">Escolha a classificação</option>
                  {filteredOptions.classificacao.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {errors.classificacao ? <span className={errorTextClasses}>{errors.classificacao}</span> : null}
              </label>
            </div>

            <div className="grid gap-3 sm:gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-8">
              <label className={labelClasses}>
                <FieldLabel label="Quantidade" />
                <input
                  type="number"
                  min={1}
                  name="quantidade"
                  value={formData.quantidade}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                />
                {errors.quantidade ? <span className={errorTextClasses}>{errors.quantidade}</span> : null}
              </label>

              <label className={labelClasses}>
                <FieldLabel label="Data e hora da solic" />
                <input
                  type="datetime-local"
                  step={60}
                  name="dataSolicitacao"
                  value={formData.dataSolicitacao}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                />
                {errors.dataSolicitacao ? <span className={errorTextClasses}>{errors.dataSolicitacao}</span> : null}
              </label>

            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isLoading || isOwnerLocked}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-700 px-5 py-4 text-base font-semibold text-white transition hover:bg-sky-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 sm:rounded-3xl xl:col-span-12 xl:w-auto xl:min-w-80 xl:justify-self-end xl:px-12"
        >
          {isLoading ? 'Enviando...' : 'Enviar intenção'}
        </button>
      </form>

      {notification.open ? (
        <div className={notificationBackdropClasses}>
          <div className={`${notificationCardBaseClasses} ${notificationTone.container}`}>
            <div className="flex items-start gap-4 p-5 sm:p-6">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${notificationTone.pill}`}>
                <NotificationIcon className={`h-6 w-6 ${notificationTone.iconClass}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
                  {notificationEyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{notification.title}</h2>
                <p className="mt-2 text-sm leading-6 opacity-90">{notification.description}</p>
              </div>
              <button
                type="button"
                onClick={closeNotification}
                className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Fechar mensagem"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className={notificationFooterClasses}>
              <button
                type="button"
                onClick={closeNotification}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/15 sm:w-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
