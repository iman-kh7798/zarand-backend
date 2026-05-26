// i want to import from @types/kavenegar how to do that?

import { Injectable } from '@nestjs/common';

const Kavenegar = require('kavenegar');

@Injectable()
export class SmsService {
  private readonly kavenegar;
  constructor() {
    const apiKey = process.env.KAVENEGAR_API_KEY;
    this.kavenegar = Kavenegar.KavenegarApi({ apikey: apiKey });
  }

  sendCode(phone: string, code: string) {
    const sender = process.env.KAVENEGAR_SENDER || '10008663';
    const message = `Your verification code is: ${code} Zarand Backend :)`;
    this.kavenegar.Send({
      message,
      sender,
      receptor: phone,
    });
    console.log(`Sent verification code to ${phone}: ${code}`);
  }
}
