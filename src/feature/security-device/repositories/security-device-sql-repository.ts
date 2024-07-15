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
 "issuedAtRefreshToken", "userId", ip, "nameDevice","deviceId")
VALUES ($1,$2,$3,$4,$5);
    `,
      [
        device.issuedAtRefreshToken,
        device.userId,
        device.ip,
        device.nameDevice,
        device.deviceId,
      ],
    );
    /*вернётся пустой массив или null*/
    return result;
  }

  async findDeviceByIdAndDate(deviceId: string, issuedAtRefreshToken: string) {
    const result = await this.dataSource.query(
      `
        select *
from public."securityDevice" u
where u."issuedAtRefreshToken" = $1
and u."deviceId"  = $2
    `,
      [issuedAtRefreshToken, deviceId],
    );
    /*в result будет  массив --- если не найдет запись ,
     тогда ПУСТОЙ МАССИВ,   если найдет запись
     тогда первым элементом в массиве будет обьект  а
     вторым элементом будет число указывающее сколько записей найдено, но у меня может быть только одна запись с такими полями */
    if (result[1] === 0) return false;
    return result[0];
  }

  async changeSecurityDevice(id: string, newIssuedAtRefreshToken: string) {
    const result = await this.dataSource.query(
      `
    update public."securityDevice"
    set "issuedAtRefreshToken"=$1
    where id = $2
    `,
      [newIssuedAtRefreshToken, id],
    );
    /*    в result будет всегда  всегда первым
           элементом  ПУСТОЙ МАССИВ, а вторым элементом
           или НОЛЬ(если ничего не изменилось) или число-сколько  строк изменилось
           (в данном случае еденица будет
   вторым элементом масива )*/
    if (result[1] === 0) return false;
    return true;
  }
}
