import { Document } from 'mongoose';
import { Prop as Property, raw, Schema, SchemaFactory } from '@nestjs/mongoose';


@Schema({
  collation: { locale: 'en_US', strength: 1, caseLevel: true },
  timestamps: true,
})
export class RegisteredFlatDevices extends Document {
  @Property({ required: true, index: true })
  flatId: string;

  @Property({ default: false, index: true })
  pull?: boolean;


}

export const RegisteredFlatDevicesSchema = SchemaFactory.createForClass(RegisteredFlatDevices);

@Schema({
  collation: { locale: 'en_US', strength: 1, caseLevel: true },
  timestamps: true,
})
export class Device extends Document {
  @Property({required: true})
  name: string;

  @Property({ required: true, index: true })
  deviceId: string;

  @Property()
  roomNr: number;

  @Property({ required: true, index: true })
  flatId: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

@Schema({
  collation: { locale: 'en_US', strength: 1, caseLevel: true },
  timestamps: true,
})
export class Measurement extends Document {

  @Property({ index: true })
  deviceId: string;

  @Property([raw({
    _id: false,
    temperature: { type: Number },
    meterValue: { type: Number },
    timestamp: { type: Date },
  })])
  values: Record<string, any>[];

}

export const MeasurementSchema = SchemaFactory.createForClass(Measurement);

@Schema({
  collation: { locale: 'en_US', strength: 1, caseLevel: true },
  timestamps: true,
})
export class MeasurementStatus extends Document {
  @Property()
  lastUpdate?: Date;

  @Property()
  timeDiffInMillis?: number;
}

export const MeasurementStatusSchema = SchemaFactory.createForClass(MeasurementStatus);
