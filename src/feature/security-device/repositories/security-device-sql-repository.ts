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

  async findDeviceByDeviceId(deviceId: string) {
    const result = await this.dataSource.query(
      `
        select *
from public."securityDevice" s
where s."deviceId" = $1
    `,
      [deviceId],
    );
    debugger;
    /*в result будет  массив --- если не найдет запись ,
        тогда ПУСТОЙ МАССИВ,   если найдет запись
        тогда первым элементом в массиве будет обьект */
    if (result.length === 0) return null;

    return result[0];
  }

  async findDeviceByUserIdAndDeviceIdFromParam(
    userId: string,
    deviceIdFromParam: string,
  ) {
    const result = await this.dataSource.query(
      `
        select *
from public."securityDevice" u
where u."userId" = $1
and u."deviceId"  = $2
    `,
      [userId, deviceIdFromParam],
    );
    /*в result будет  массив --- если не найдет запись ,
     тогда ПУСТОЙ МАССИВ,   если найдет запись
     тогда первым элементом в массиве будет обьект  а
     вторым элементом будет число указывающее сколько записей найдено, но у меня может быть только одна запись с такими полями */
    if (result[1] === 0) return false;
    return result[0];
  }

  async deleteDeviceByDeviceId(deviceId: string) {
    const result = await this.dataSource.query(
      `
DELETE FROM public."securityDevice"
WHERE "deviceId"=$1;
    `,
      [deviceId],
    );

    /*    в result будет всегда массив с двумя элементами
     и всегда первым
         элементом будет ПУСТОЙ МАССИВ, а вторым элементом
         или НОЛЬ(если ничего не изменилось) или число-сколько
         строк изменилось(в данном случае еденица будет
 вторым элементом масива )*/

    if (result[1] === 0) return false;
    return true;
  }

  async deleteDevicesExeptCurrentDevice(userId: string, deviceId: string) {
    /* нужно удалить все устройства с приходящим  userId, за исключением deviceId который пришол. ТОЕСТЬ у юзера может быть 3 девайса и удалится 2, а тот с которого он запрос данный делает, тот останется в таблице.*/

    const result = await this.dataSource.query(
      `
    DELETE FROM public."securityDevice" s
    WHERE "userId"=$1 AND "deviceId" <> $2;
    `,
      [userId, deviceId],
    );

    /*условие AND "deviceId" <> $2, --- гарантирует, что 
    будут удалены ВСЕ устройства с userId, КРОМЕ 
    устройства с указанным deviceId
*/

    if (result[1] === 0) return false;
    return true;
  }
}
