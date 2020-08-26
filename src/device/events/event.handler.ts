import { Event } from './event';
import { RpcException } from '@nestjs/microservices';
import { Injectable } from '@nestjs/common';
import { DeviceService } from '../device.service';
import { CreateDeviceDto } from '../dto';
import { CreateDeviceEvent } from './create-device.event';
import { DeleteDeviceEvent } from './delete-device.event';
import { StateDeviceEvent } from './state-device.event';

@Injectable()
export class EventHandler {
  constructor(private readonly deviceService: DeviceService) {}

  async handleEvent(event: Event): Promise<boolean> {
    if (event.action === 'CreateDevice') {
      return this.handleCreateDeviceEvent(event as CreateDeviceEvent);
    } else if (event.action === 'DeleteDevice') {
      return this.handleDeleteDeviceEvent(event as DeleteDeviceEvent);
    } else if (event.action === 'PullStateChangeDevice') {
      return this.handleStatusChangeDeviceEvent(event as StateDeviceEvent);
    } else {
      throw new RpcException(`Unsupported event action: ${event.action}`);
    }
  }

  private async handleCreateDeviceEvent(event: CreateDeviceEvent): Promise<boolean> {
    return this.deviceService.createOne(event.data as CreateDeviceDto);
  }

  private async handleDeleteDeviceEvent(event: DeleteDeviceEvent): Promise<boolean> {
    return this.deviceService.deleteOne(event.data.flatId);
  }

  private async handleStatusChangeDeviceEvent(event: StateDeviceEvent): Promise<boolean> {
    const { flatId, pull } = event.data;
    return this.deviceService.updateDevicePullState(flatId, pull);
  }
}
