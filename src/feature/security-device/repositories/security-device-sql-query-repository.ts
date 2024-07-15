import { Injectable } from '@nestjs/common';
import { ViewSecurityDevice } from '../api/types/views';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecurityDeviceWithId } from '../api/types/dto';

@Injectable()
/*@Injectable()-декоратор что данный клас инжектируемый
 * ОБЯЗАТЕЛЬНО ДОБАВЛЯТЬ его В ФАЙЛ app.module
 * providers: []*/
export class SecurityDeviceSqlQueryRepository {
  constructor(@InjectDataSource() protected dataSource: DataSource) {}

  async getAllDevicesCorrectUser(userId: string) {
    const result = await this.dataSource.query(
      `
    select *
    from public."securityDevice" s
    where s."userId"=$1
    `,
      [userId],
    );

    /*в result будет  массив --- если не найдет запись ,
    тогда ПУСТОЙ МАССИВ,   если найдет запись или много
    записей тогда будут в массиве обьекты  */

    if (result.length === 0) return null;

    /*  надо отмапить--- привести к виду который
    ожидает фронтенд*/

    const arrayDevices: ViewSecurityDevice[] = result.map(
      (device: SecurityDeviceWithId) => {
        return this.createViewModelDevice(device);
      },
    );

    return arrayDevices;
  }

  createViewModelDevice(device: SecurityDeviceWithId): ViewSecurityDevice {
    return {
      ip: device.ip,
      title: device.nameDevice,
      lastActiveDate: device.issuedAtRefreshToken,
      deviceId: device.deviceId,
    };
  }
}
