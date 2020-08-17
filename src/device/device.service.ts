import { HttpService, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Device, Measurement, MeasurementStatus, RegisteredFlatDevices } from './device.schema';
import { LoggerService } from '@device/logger';
import { Interval } from '@nestjs/schedule';
import { CreateDeviceDto } from './dto';
import { MeasurementValue, RoomMeasurement } from './device.interface';
import { v4 as uuid } from 'uuid';
import { ClientKafka } from '@nestjs/microservices';


@Injectable()
export class DeviceService {
  credentials = process.env.CREDENTIALS;

  constructor(@InjectModel('Device') private readonly model: Model<Device>,
              @InjectModel('RegisteredFlatDevices') private readonly registeredFlatDevicesModel: Model<RegisteredFlatDevices>,
              @InjectModel('Measurement') private readonly measurementModel: Model<Measurement>,
              @InjectModel('MeasurementStatus') private readonly measurementStatusModel: Model<MeasurementStatus>,
              @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
              private readonly httpService: HttpService,
              private readonly logger: LoggerService) {
  }

  @Interval(10000)
  async pollMeasurements(): Promise<void> {
    this.logger.debug('Poll Measurements');
    const allDevicesInFlat: RegisteredFlatDevices[] = await this.registeredFlatDevicesModel.find({ pull: true }).exec();
    for (const device of allDevicesInFlat) {
      const roomsMeasurements = await this.getRoomsMeasurements(device.flatId);
      await this.addMeasurements(device.flatId, roomsMeasurements);
    }

    // update measurement status
    const measurementStatus = await this.measurementStatusModel.find().exec();
    if (!measurementStatus[0]) {
      await this.measurementStatusModel.create({ lastUpdate: new Date(), timeDiffInMillis: 0})
    } else {
      const nowDate = Date.now();
      const timeDiffInMillis = measurementStatus[0].lastUpdate ? nowDate - new Date(measurementStatus[0].lastUpdate).getTime() : 0;
      await this.measurementStatusModel.updateOne({ '_id': measurementStatus[0]._id }, {
        $set: {
          lastUpdate: new Date(nowDate),
          timeDiffInMillis,
        },
      }, { new: true }).exec();
    }
  }

  async findAll(): Promise<Device[]> {
    return this.model.find().exec();
  }

  async findOne(id: string): Promise<Device> {
    return this.model.findById(id);
  }

  async getMeasurementStatus(): Promise<MeasurementStatus> {
    return this.measurementStatusModel.find().exec()[0];
  }

  async createOne(dto: CreateDeviceDto): Promise<boolean> {
    this.logger.debug(`Registry all devices into flat ${dto.flatId}`);
    const roomsMeasurements = await this.getRoomsMeasurements(dto.flatId);

    try {
      // registered flat id
      await this.registeredFlatDevicesModel.create(dto);

      // collect all devices in flat
      const bulkOperations = roomsMeasurements.map((rm: RoomMeasurement) => rm.roomNr).map((roomNr: number) => ({
        insertOne: {
          document: {
            deviceId: uuid(),
            flatId: dto.flatId,
            name: `device-${dto.flatId}-room-${roomNr}`,
            roomNr,
          },
        },
      }));

      const bulkOpResult = await this.model.bulkWrite(bulkOperations);
      const { insertedIds } = bulkOpResult;

      // create measurements
      const measurementsBulkOperations = Object.values(insertedIds).map((id: string) => ({
        insertOne: {
          document: {
            deviceId: id,
            values: [],
          },
        },
      }));

      await this.measurementModel.bulkWrite(measurementsBulkOperations);
      this.kafkaClient.emit('device-created-event', {
        id: uuid(),
        type: 'event',
        action: 'DeviceCreated',
        timestamp: Date.now(),
        data: {
          flatId: dto.flatId,
          status: 'CREATED',
        },
      });

    } catch (err) {
      this.logger.error(err);
      this.kafkaClient.emit('device-created-event', {
        id: uuid(),
        type: 'event',
        action: 'DeviceCreated',
        timestamp: Date.now(),
        data: {
          flatId: dto.flatId,
          status: 'NO_CREATED',
        },
      });
      return false;
    }

    return true;
  }

  async updateDevicePullState(flatId: string, pull: boolean): Promise<boolean> {
    await this.registeredFlatDevicesModel.updateOne({ flatId }, { $set: { pull } }, { new: true }).exec();
    return true;
  }

  async deleteOne(flatId: string): Promise<boolean> {

    const deletion = await this.registeredFlatDevicesModel.deleteOne({ flatId }).exec();
    if (deletion.n < 1) {
      throw new NotFoundException();
    }

    // find all flat devices
    const flatDevices = await this.model.find({ flatId }).exec();

    if (!flatDevices.length) {
      throw new NotFoundException();
    }
    const bulkOperations = flatDevices.map((device) => ({ deleteOne: { filter: { '_id': device._id } } }));
    await this.measurementModel.bulkWrite(bulkOperations);
    await this.model.deleteMany({ flatId }).exec();

    return true;
  }

  async readMeasurements(deviceId: string): Promise<MeasurementValue[]> {
    const measurement = await this.measurementModel.findOne({ deviceId }).exec();
    return measurement.values as MeasurementValue[];
  }

  private getRoomsMeasurements(flatId: string): Promise<any> {
    this.logger.debug(`Get Measurements of Flat: ${flatId}`);

    return new Promise<any>(async (resolve, reject) => {
      try {
        const response = await this.httpService
          .get(`https://applik-d18.iee.fraunhofer.de:8443/flat/${flatId}/measurements/`, { headers: { authorization: `Basic ${this.credentials}` } })
          .toPromise();

        const roomsMeasurements = response.data.rooms;
        return resolve(roomsMeasurements);
      } catch (err) {
        this.logger.error(err);
        return reject(err);
      }
    });
  }

  private async addMeasurements(flatId: string, roomsMeasurements: RoomMeasurement[]): Promise<void> {
    const flatDevices = await this.model.find({ flatId }).exec();

    const bulkOperations = flatDevices.map((device) => {
      const roomMeasurement = roomsMeasurements.find((rm: RoomMeasurement) => rm.roomNr === device.roomNr);
      const measurement = {
        timestamp: new Date(roomMeasurement.temperature.timestamp).getTime(),
        temperature: roomMeasurement.temperature.value,
        meterValue: roomMeasurement.meterValue.value,
      };
      return {
        updateOne: {
          filter: { '_id': device._id },
          update: {
            $addToSet: {
              values: measurement,
            },
          },
        },
      };
    });

    await this.measurementModel.bulkWrite(bulkOperations);


    for (const device of flatDevices) {
      console.log(device);
      const roomMeasurement = roomsMeasurements.find((rm: RoomMeasurement) => rm.roomNr === device.roomNr);
      const measurement = {
        timestamp: new Date(roomMeasurement.temperature.timestamp).getTime(),
        temperature: roomMeasurement.temperature.value,
        meterValue: roomMeasurement.meterValue.value,
      };
      console.log(measurement);
      await this.measurementModel.update({ '_id': device._id }, { $addToSet: { values: measurement } }, { upsert: true }).exec();
    }
  }


}
