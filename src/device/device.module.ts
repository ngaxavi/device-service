import { HttpModule, Module } from '@nestjs/common';
import { LoggerService } from '@device/logger';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceSchema, MeasurementSchema, MeasurementStatusSchema, RegisteredFlatDevicesSchema } from './device.schema';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { ScheduleModule } from '@nestjs/schedule';
import { EventHandler } from './events/event.handler';


@Module({
  imports: [HttpModule.register({ timeout: 5000 }),
    MongooseModule.forFeature([{ name: 'RegisteredFlatDevices', schema: RegisteredFlatDevicesSchema }, {
      name: 'Device',
      schema: DeviceSchema,
    }, {
      name: 'Measurement',
      schema: MeasurementSchema,
    }, { name: 'MeasurementStatus', schema: MeasurementStatusSchema }]), ScheduleModule.forRoot()],
  controllers: [DeviceController],
  providers: [DeviceService, EventHandler, LoggerService],
})
export class DeviceModule {
}
