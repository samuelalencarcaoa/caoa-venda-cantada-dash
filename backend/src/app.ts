import cors from 'cors';
import express, { json, Request, Response, NextFunction } from 'express';
import salesIntentionCatalogRoutes from './routes/salesIntentionCatalogRoutes';
import salesIntentionModelosDealerRoutes from './routes/salesIntentionModelosDealerRoutes';
import salesIntentionRoutes from './routes/salesIntentionRoutes';
import { AppError } from './errors/AppError';
import { getSwaggerHtml, openApiSpec } from './swagger';
import { isPrismaPoolTimeoutError } from './utils/prismaResilience';

const app = express();

app.use(cors());
app.use(json());
app.use('/sales-intentions', salesIntentionRoutes);
app.use('/sales-intention-catalogs', salesIntentionCatalogRoutes);
app.use('/sales-intention-modelos-dealer', salesIntentionModelosDealerRoutes);
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});
app.get('/docs', (_req: Request, res: Response) => {
  res.type('html').send(getSwaggerHtml('/openapi.json'));
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  if (isPrismaPoolTimeoutError(err)) {
    res.setHeader('Retry-After', '3');
    res.status(503).json({
      message: 'O banco de dados está temporariamente ocupado. Tente novamente em instantes.'
    });
    return;
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({ message: err.message || 'Erro interno do servidor.' });
});

export default app;
