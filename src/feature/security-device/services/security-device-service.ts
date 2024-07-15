import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SecurityDeviceRepository } from '../repositories/security-device-repository';
import { SecurityDeviceSqlRepository } from '../repositories/security-device-sql-repository';
import { SecurityDeviceSqlQueryRepository } from '../repositories/security-device-sql-query-repository';

@Injectable()
export class SecurityDeviceService {
  constructor(
    protected securityDeviceRepository: SecurityDeviceRepository,
    protected securityDeviceSqlRepository: SecurityDeviceSqlRepository,
    protected securityDeviceSqlQueryRepository: SecurityDeviceSqlQueryRepository,
  ) {}

  async getAllDevicesCorrectUser(
    deviceId: string,
    issuedAtRefreshToken: string,
  ) {
    const oneDevice =
      await this.securityDeviceSqlRepository.findDeviceByIdAndDate(
        deviceId,
        issuedAtRefreshToken,
      );

    if (!oneDevice) return null;

    const userId = oneDevice.userId;

    return this.securityDeviceSqlQueryRepository.getAllDevicesCorrectUser(
      userId,
    );
  }

  async deleteDevicesExeptCurrentDevice(
    deviceId: string,
    issuedAtRefreshToken: string,
  ) {
    const oneDevice =
      await this.securityDeviceSqlRepository.findDeviceByIdAndDate(
        deviceId,
        issuedAtRefreshToken,
      );

    if (!oneDevice) return null;

    const userId = oneDevice.userId;

    await this.securityDeviceSqlRepository.deleteDevicesExeptCurrentDevice(
      userId,
      deviceId,
    );

    return true;
  }

  async deleteDeviceByDeviceId(
    deviceIdFromRefreshToken: string,
    deviceIdFromParam: string,
  ) {
    const device =
      await this.securityDeviceSqlRepository.findDeviceByDeviceId(
        deviceIdFromParam,
      );

    if (!device) return null; //404

    /*   чтобы достать userId ТОГО 
       ПОЛЬЗОВАТЕЛЯ КОТОРЫЙ ДЕЛАЕТ ЗАПРОС 
       мне надо найти документ  по deviceIdFromRefreshToen*/

    const deviceCurrentUser =
      await this.securityDeviceSqlRepository.findDeviceByDeviceId(
        deviceIdFromRefreshToken,
      );

    if (!deviceCurrentUser) return null; //404

    const userId = deviceCurrentUser.userId;

    const correctDevice =
      await this.securityDeviceSqlRepository.findDeviceByUserIdAndDeviceIdFromParam(
        userId,
        deviceIdFromParam,
      );

    if (!correctDevice) {
      /*   403 статус код */
      throw new ForbiddenException(
        ' not delete device :andpoint-security/devices/deviceId,method-delete',
      );
    }

    return this.securityDeviceSqlRepository.deleteDeviceByDeviceId(
      deviceIdFromParam,
    );
  }

  async logout(deviceId: string, issuedAtRefreshToken: string) {
    const oneDevice = await this.securityDeviceRepository.findDeviceByIdAndDate(
      deviceId,
      issuedAtRefreshToken,
    );

    if (!oneDevice) {
      throw new UnauthorizedException(
        "user didn't logout because refreshToken not exist in BD :andpoint-auth/logout,method - post",
      );
    }
    return this.securityDeviceRepository.deleteDeviceByDeviceId(deviceId);
  }
}
