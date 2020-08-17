import { Controller, Get, Param, UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { KafkaEvent, KafkaExceptionFilter, KafkaTopic } from '@device/kafka';
import { Roles, RolesGuard } from '@device/auth';
import { DeviceService } from './device.service';
import { ConfigService } from '@device/config';
import { Device, MeasurementStatus } from './device.schema';
import { MongoPipe } from '@device/validation';
import { Event } from './events/event';
import { EventHandler } from './events/event.handler';
import { MeasurementValue } from './device.interface';

@Controller('devices')
@UseGuards(RolesGuard)
@UseFilters(KafkaExceptionFilter)
@UsePipes(new ValidationPipe())
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly config: ConfigService,
    private readonly eventHandler: EventHandler,
  ) {}

  @Get()
  async findAll(): Promise<Device[]> {
    return this.deviceService.findAll();
  }

  @Get(':id')
  @Roles('read')
  async findOne(@Param('id', new MongoPipe()) id: string): Promise<Device> {
    return this.deviceService.findOne(id);
  }

  @Get(':id/measurements')
  @Roles('read')
  async readMeasurements(@Param('id', new MongoPipe()) id: string): Promise<MeasurementValue[]> {
    return this.deviceService.readMeasurements(id);
  }

  @Get('measurements/status')
  @Roles('read')
  async getMeasurementStatus(): Promise<MeasurementStatus> {
    return this.deviceService.getMeasurementStatus();
  }

  @KafkaTopic('device-create-event')
  async onCreateFlatCommand(@KafkaEvent() event: Event): Promise<void> {
    await this.eventHandler.handleEvent(event);
  }

  @KafkaTopic('device-pull-event')
  async onStatusFlatCommand(@KafkaEvent() event: Event): Promise<void> {
    await this.eventHandler.handleEvent(event);
  }

  @KafkaTopic('device-delete-event')
  async onDeleteFlatCommand(@KafkaEvent() event: Event): Promise<void> {
    await this.eventHandler.handleEvent(event);
  }
}
