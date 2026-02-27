import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhookHandler } from './webhook.handler';
import { isLocal } from '../common/config/environment';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookHandler: WebhookHandler) {}

  @Post('payment/wave')
  @HttpCode(HttpStatus.OK)
  async wave(@Req() req: Request, @Res() res: Response) {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const signature = (req.headers['wave-signature'] as string) ?? '';
      await this.webhookHandler.handleWave(body, signature);
      res.json({ received: true });
    } catch (error: unknown) {
      console.error('[Webhook Wave]', (error as Error).message);
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }

  @Post('payment/orange')
  @HttpCode(HttpStatus.OK)
  async orange(@Req() req: Request, @Res() res: Response) {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const signature = (req.headers['x-cinetpay-signature'] as string) ?? '';
      await this.webhookHandler.handleOrangeMoney(body, signature);
      res.status(200).send('OK');
    } catch (error: unknown) {
      console.error('[Webhook Orange]', (error as Error).message);
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }

  @Post('payment/mock')
  @HttpCode(HttpStatus.OK)
  async mock(@Req() req: Request) {
    if (!isLocal()) {
      throw new ForbiddenException('Mock webhook désactivé en production');
    }
    const raw = req.body;
    const body =
      typeof raw === 'string'
        ? JSON.parse(raw)
        : raw instanceof Buffer
          ? JSON.parse(raw.toString('utf8'))
          : (raw as { reference: string; status: string; amount?: number });
    console.log(`\n🧪 [MOCK WEBHOOK] Reçu :`, body);
    const isSuccess = body.status === 'SUCCESS';
    await this.webhookHandler.processCotisationPayment(
      body.reference,
      isSuccess,
      'MTN_MOMO',
      `mock-tx-${Date.now()}`,
    );
    return { received: true };
  }

  @Post('payment/mtn')
  @HttpCode(HttpStatus.OK)
  async mtn(@Req() req: Request, @Res() res: Response) {
    try {
      const rawBody =
        req.body instanceof Buffer
          ? req.body.toString('utf8')
          : typeof req.body === 'string'
            ? req.body
            : JSON.stringify(req.body);
      const body = JSON.parse(rawBody);
      const signature =
        (req.headers['x-callback-signature'] as string) ?? '';
      await this.webhookHandler.handleMTNMoMo(body, signature, rawBody);
      res.json({ received: true });
    } catch (error: unknown) {
      console.error('[Webhook MTN]', (error as Error).message);
      res.status(400).json({
        error: (error as Error).message,
      });
    }
  }
}
