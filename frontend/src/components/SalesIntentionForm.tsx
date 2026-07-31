'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { z } from 'zod';

import useCurrentUser from '@/hooks/useCurrentUser';
import {
  createSalesIntention,
  fetchSalesIntentionCatalogs,
  formatSalesIntentionApiError,
  type SalesIntentionCatalogResponse,
  type SalesIntentionCatalogSources
} from '@/lib/salesIntentionApi';
import type { SalesIntentionPayload } from '@/types/types';

const emptyCatalogSources: SalesIntentionCatalogSources = {
  tipoVenda: [],
  bandeira: [],
  regional: [],
  lojaVenda: [],
  classificacao: []
};

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

function getCurrentDateValue() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${today.getFullYear()}`;
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
        .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use a data no formato DD/MM/AAAA.'),
      placa: z.string().trim().min(1, 'Informe a placa do veículo.'),
      regional: z.string().trim().min(1, 'Escolha a regional.'),
      ano: z.string().trim(),
      modelo: z.string().trim()
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

      if (isTipoVenda(data.tipoVenda, 'SEMINOVOS')) {
        if (!data.ano) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ano'],
            message: 'Escolha o ano do veículo.'
          });
        }

        if (!data.modelo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['modelo'],
            message: 'Escolha o modelo do veículo.'
          });
        }
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

function formatDateInput(value: string) {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function getDateInputValue(value: string) {
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const firstYear = 1950;
  return Array.from({ length: currentYear - firstYear + 2 }, (_, index) =>
    String(currentYear + 1 - index)
  );
}

function getAdjacentYearOptions(selectedYear: string, allYears: string[]) {
  if (!selectedYear) {
    return allYears;
  }

  const yearNumber = Number(selectedYear);
  if (Number.isNaN(yearNumber)) {
    return allYears;
  }

  const allowedYears = new Set([yearNumber - 1, yearNumber, yearNumber + 1].map(String));
  return allYears.filter((year) => allowedYears.has(year));
}

function formatBrazilPlateInput(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (cleaned.length <= 3) {
    return cleaned;
  }

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

function isBrazilPlate(value: string) {
  return /^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(value.trim().toUpperCase());
}

const fieldClasses =
  'min-h-12 w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 outline-none ring-1 ring-transparent transition duration-150 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-80 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/10 dark:disabled:bg-slate-900/80 sm:min-h-14 sm:rounded-3xl sm:py-3 sm:text-base';

const labelClasses = 'flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300';
const helperTextClasses = 'text-xs text-slate-500 dark:text-slate-400';
const errorTextClasses = 'text-xs text-rose-600 dark:text-rose-300';
const pageCardClasses =
  'mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-200/70 sm:rounded-[32px] sm:shadow-xl dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)] dark:ring-white/5';
const headerCardClasses =
  'border-b border-slate-200 bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 p-5 text-white sm:p-6 dark:border-white/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700';
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
    dataSolicitacao: getCurrentDateValue(),
    ano: '',
    modelo: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [catalogData, setCatalogData] = useState<SalesIntentionCatalogResponse | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>(defaultNotification);
  const yearOptions = useMemo(() => getYearOptions(), []);

  useEffect(() => {
    let active = true;

    async function loadCatalogRows() {
      setIsCatalogLoading(true);
      try {
        const rows = await fetchSalesIntentionCatalogs();
        if (!active) return;
        setCatalogData(rows);
      } catch (error) {
        if (!active) return;
        openNotification(
          'error',
          'Não conseguimos carregar os campos',
          getNotificationDescription(error)
        );
      } finally {
        if (active) {
          setIsCatalogLoading(false);
        }
      }
    }

    void loadCatalogRows();

    return () => {
      active = false;
    };
  }, []);

  const anoOptions = useMemo(
    () => getAdjacentYearOptions(formData.modelo, yearOptions),
    [formData.modelo, yearOptions]
  );
  const modeloOptions = useMemo(
    () => getAdjacentYearOptions(formData.ano, yearOptions),
    [formData.ano, yearOptions]
  );

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
        return { ...current, placa: '-', ano: '', modelo: '' };
      }

      if (isTipoVenda(current.tipoVenda, 'SEMINOVOS') && current.placa === '-') {
        return { ...current, placa: '' };
      }

      return current;
    });
  }, [formData.tipoVenda]);

  const catalogSources = catalogData?.sources ?? emptyCatalogSources;
  const catalogHierarchy = catalogData?.hierarchy ?? [];
  const catalogRows = catalogData?.combinations ?? [];

  const filteredOptions = useMemo(
    () => ({
      tipoVenda: catalogSources.tipoVenda.map((value) => ({
        value,
        label: formatTipoVendaLabel(value)
      })),
      bandeira: catalogSources.bandeira,
      regional: getFilteredOptions('regional', { bandeira: formData.bandeira }, catalogHierarchy),
      lojaVenda: getFilteredOptions(
        'lojaVenda',
        {
          bandeira: formData.bandeira,
          regional: formData.regional
        },
        catalogHierarchy
      ),
      marcaVeiculo: getFilteredOptions('Marca_Veiculo', {}, catalogRows),
      versao: getFilteredOptions('Versao', { Marca_Veiculo: formData.marcaVeiculo }, catalogRows),
      classificacao: catalogSources.classificacao
    }),
    [catalogHierarchy, catalogRows, catalogSources, formData.bandeira, formData.marcaVeiculo, formData.regional]
  );

  const vehicleHelpText =
    isTipoVenda(formData.tipoVenda, 'NOVOS')
      ? 'Mostrando apenas veículos zero quilômetro.'
      : isTipoVenda(formData.tipoVenda, 'SEMINOVOS')
        ? 'Mostrando apenas veículos seminovos.'
        : 'Escolha o tipo de venda para liberar os veículos.';
  const showSeminovosFields = isTipoVenda(formData.tipoVenda, 'SEMINOVOS');
  const closeNotification = () => setNotification(defaultNotification);
  const isOptionsLoading = isCatalogLoading;

  const openNotification = (variant: NotificationVariant, title: string, description: string) => {
    setNotification({
      open: true,
      variant,
      title,
      description: clampNotificationDescription(description)
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;

    const nextValue =
      name === 'quantidade'
        ? Number(value)
        : name === 'dataSolicitacao' && type === 'date'
          ? formatDateInput(value)
          : name === 'placa'
            ? formatBrazilPlateInput(value)
          : value;

    setFormData((current) => {
      const nextFormData = {
        ...current,
        [name]: nextValue,
        ...(name === 'marcaVeiculo' ? { versao: '' } : {}),
        ...(name === 'bandeira' ? { regional: '', lojaVenda: '' } : {}),
        ...(name === 'regional' ? { lojaVenda: '' } : {})
      };

      if (name === 'ano') {
        const allowedModelos = getAdjacentYearOptions(String(nextValue), yearOptions);
        if (nextFormData.modelo && !allowedModelos.includes(nextFormData.modelo)) {
          nextFormData.modelo = '';
        }
      }

      if (name === 'modelo') {
        const allowedAnos = getAdjacentYearOptions(String(nextValue), yearOptions);
        if (nextFormData.ano && !allowedAnos.includes(nextFormData.ano)) {
          nextFormData.ano = '';
        }
      }

      return nextFormData;
    });

    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === 'tipoVenda' ? { placa: undefined, ano: undefined, modelo: undefined } : {}),
      ...(name === 'bandeira' ? { regional: undefined, lojaVenda: undefined } : {}),
      ...(name === 'regional' ? { lojaVenda: undefined } : {}),
      ...(name === 'ano' ? { modelo: undefined } : {}),
      ...(name === 'modelo' ? { ano: undefined } : {}),
      ...(name === 'marcaVeiculo' ? { versao: undefined } : {})
    }));
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
        ano_fabricacao: ano ? Number(ano) : null,
        ano_modelo: modelo ? Number(modelo) : null
      });

      const elapsed = Date.now() - submitStartedAt;
      if (elapsed < MIN_FEEDBACK_LOADING_MS) {
        await wait(MIN_FEEDBACK_LOADING_MS - elapsed);
      }

      setFormData({
        ...initialValues,
        dataSolicitacao: getCurrentDateValue(),
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
        className="grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-6 md:grid-cols-2 xl:grid-cols-12"
      >
        <div className="grid gap-4 md:col-span-2 xl:col-span-8">
          <label className={labelClasses}>
            Proprietário
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

        <div className="grid gap-4 xl:col-span-4">
          <label className={labelClasses}>
            Tipo de venda
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

        <div className="grid gap-4 xl:col-span-4">
          <label className={labelClasses}>
            Bandeira
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

        <div className="grid gap-4 xl:col-span-3">
          <label className={labelClasses}>
            Regional
            <select
              name="regional"
              value={formData.regional}
              onChange={handleChange}
              className={fieldClasses}
              disabled={isLoading || isOptionsLoading || !formData.bandeira}
            >
              <option value="">{formData.bandeira ? 'Escolha a regional' : 'Escolha a bandeira primeiro'}</option>
              {filteredOptions.regional.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span className={helperTextClasses}>
              {formData.bandeira
                ? 'As regionais são filtradas pela bandeira selecionada.'
                : 'Escolha a bandeira para liberar as regionais.'}
            </span>
            {errors.regional ? <span className={errorTextClasses}>{errors.regional}</span> : null}
          </label>
        </div>

        <div className="grid gap-4 xl:col-span-5">
          <label className={labelClasses}>
            Loja de venda
            <select
              name="lojaVenda"
              value={formData.lojaVenda}
              onChange={handleChange}
              className={fieldClasses}
              disabled={isLoading || isOptionsLoading || !formData.bandeira || !formData.regional}
            >
              <option value="">
                {formData.bandeira
                  ? formData.regional
                    ? 'Escolha a loja'
                    : 'Escolha a regional primeiro'
                  : 'Escolha a bandeira primeiro'}
              </option>
              {filteredOptions.lojaVenda.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span className={helperTextClasses}>
              {formData.bandeira && formData.regional
                ? 'As lojas são filtradas pela regional selecionada.'
                : formData.bandeira
                  ? 'Escolha a regional para liberar as lojas.'
                  : 'Escolha a bandeira para liberar as lojas.'}
            </span>
            {errors.lojaVenda ? <span className={errorTextClasses}>{errors.lojaVenda}</span> : null}
          </label>
        </div>

        {showSeminovosFields ? (
          <div className="grid gap-4 md:col-span-2 xl:col-span-2">
            <label className={labelClasses}>
              Placa
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
          </div>
        ) : null}

        <div
          className="grid gap-4 md:col-span-2 xl:col-span-4"
        >
          <label className={labelClasses}>
            Marca veículo
            <select
              name="marcaVeiculo"
              value={formData.marcaVeiculo}
              onChange={handleChange}
              className={fieldClasses}
              disabled={isLoading || isOptionsLoading}
            >
              <option value="">Escolha a marca</option>
              {filteredOptions.marcaVeiculo.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span className={helperTextClasses}>{vehicleHelpText}</span>
            {errors.marcaVeiculo ? <span className={errorTextClasses}>{errors.marcaVeiculo}</span> : null}
          </label>
        </div>

        <div
          className={
            showSeminovosFields
              ? 'grid gap-4 md:col-span-2 xl:col-span-6'
              : 'grid gap-4 md:col-span-2 xl:col-span-8'
          }
        >
          <label className={labelClasses}>
            Versão
            <select
              name="versao"
              value={formData.versao}
              onChange={handleChange}
              className={fieldClasses}
              disabled={isLoading || isOptionsLoading || !formData.marcaVeiculo}
            >
              <option value="">Escolha a versão</option>
              {filteredOptions.versao.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span className={helperTextClasses}>{vehicleHelpText}</span>
            {errors.versao ? <span className={errorTextClasses}>{errors.versao}</span> : null}
          </label>
        </div>

        {showSeminovosFields ? (
          <>
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-6">
              <label className={labelClasses}>
                Ano
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

              <label className={labelClasses}>
                Modelo
                <select
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  className={fieldClasses}
                  disabled={isLoading || isOptionsLoading}
                >
                  <option value="">Selecione o modelo</option>
                  {modeloOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {errors.modelo ? <span className={errorTextClasses}>{errors.modelo}</span> : null}
              </label>
            </div>

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-12 xl:grid-cols-12">
              <label className={`${labelClasses} xl:col-span-8`}>
                Classificação
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

              <label className={`${labelClasses} xl:col-span-4`}>
                Quantidade
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
            </div>

            <div className="grid gap-4 md:col-span-2 xl:col-span-4">
              <label className={labelClasses}>
                Data de solicitação
                <input
                  type="date"
                  name="dataSolicitacao"
                  value={getDateInputValue(formData.dataSolicitacao)}
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
            <div className="grid gap-4 md:col-span-2 xl:col-span-4">
              <label className={labelClasses}>
                Classificação
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

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-8">
              <label className={labelClasses}>
                Quantidade
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
                Data de solicitação
                <input
                  type="date"
                  name="dataSolicitacao"
                  value={getDateInputValue(formData.dataSolicitacao)}
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
