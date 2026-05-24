import { Injectable } from '@nestjs/common';

interface KavenegarClient {
  Send: (options: {
    message: string;
    sender: string;
    receptor: string;
  }) => void;
}
interface KavenegarModule {
  KavenegarApi(options: { apikey?: string }): KavenegarClient;
}

const Kavenegar = require('kavenegar') as KavenegarModule;

@Injectable()
export class SmsService {
  private readonly kavenegar: KavenegarClient;
  constructor() {
    const apiKey = process.env.KAVENEGAR_API_KEY;
    this.kavenegar = Kavenegar.KavenegarApi({ apikey: apiKey });
  }

  sendCode(phone: string, code: string) {
    const sender = process.env.KAVENEGAR_SENDER || '10008663';
    const message = `Your verification code is: ${code}`;
    this.kavenegar.Send({
      message,
      sender,
      receptor: phone,
    });
  }
}
