import { Roles, RolesGuard } from '@device/auth';
import { KafkaEvent, KafkaExceptionFilter, KafkaTopic } from '@device/kafka';
import { MongoPipe } from '@device/validation';
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MeasurementValue, RoomMinMaxMeterValue } from './device.interface';
import { Device, MeasurementStatus } from './device.schema';
import { DeviceService } from './device.service';
import { UpdateDeviceDto } from './dto/update-device-dto';
import { Event } from './events/event';
import { EventHandler } from './events/event.handler';

@Controller('devices')
@UseGuards(RolesGuard)
@UseFilters(KafkaExceptionFilter)
@UsePipes(new ValidationPipe())
export class DeviceController {
  constructor(private readonly deviceService: DeviceService, private readonly eventHandler: EventHandler) {}

  @Get()
  @Roles('read')
  async findAll(): Promise<Device[]> {
    return this.deviceService.findAll();
  }

  @Get(':id')
  @Roles('read')
  async findOne(@Param('id', new MongoPipe()) id: string): Promise<Device> {
    return this.deviceService.findOne(id);
  }

  @Put(':id')
  @Roles('update')
  async updateOne(@Param('id', new MongoPipe()) id: string, @Body() dto: UpdateDeviceDto): Promise<Device> {
    return this.deviceService.updateOne(id, dto);
  }

  @Get(':id/measurements')
  @Roles('read')
  async readMeasurements(@Param('id', new MongoPipe()) id: string): Promise<MeasurementValue[]> {
    return this.deviceService.readMeasurements(id);
  }

  @Get(':flatId/meter')
  @Roles('read')
  async getMeterValueDiffForFlat(
    @Param('flatId') flatId: string,
    @Query('startTime') startTime: string,
  ): Promise<RoomMinMaxMeterValue[]> {
    return this.deviceService.getMinMaxMeterValuePerRoomInFlat(flatId, startTime);
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
