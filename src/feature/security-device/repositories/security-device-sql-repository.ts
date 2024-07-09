import { Injectable } from '@nestjs/common';

import { SecurityDevice } from '../domains/domain-security-device';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
/*@Injectable()-декоратор что данный клас инжектируемый
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ его В ФАЙЛ app.module
 * providers: []*/
export class SecurityDeviceSqlRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async createNewSecurityDevice(device: SecurityDevice) {
    const result = await this.dataSource.query(
      `
INSERT INTO public."securityDevice"(
 "issuedAtRefreshToken", "userId", ip, "nameDevice")
VALUES ($1,$2,$3,$4);
    `,
      [
        device.issuedAtRefreshToken,
        device.userId,
        device.ip,
        device.nameDevice,
      ],
    );
    /*вернётся пустой массив или null*/
    return result;
  }
}
