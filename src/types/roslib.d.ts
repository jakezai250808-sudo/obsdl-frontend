declare module 'roslib' {
  type ErrorCallback = (error: unknown) => void;

  export interface RosOptions {
    url?: string;
  }

  export class Ros {
    constructor(options?: RosOptions);
    on(event: string, cb: (...args: unknown[]) => void): void;
    off(event: string, cb: (...args: unknown[]) => void): void;
    close(): void;
    getTopics(success: (result: { topics: string[]; types: string[] }) => void, failed?: ErrorCallback): void;
    getTopicType(topic: string, success: (topicType: string) => void, failed?: ErrorCallback): void;
  }

  export interface TopicOptions {
    ros: unknown;
    name: string;
    messageType: string;
    throttle_rate?: number;
    queue_length?: number;
  }

  export class Topic {
    constructor(options: TopicOptions);
    subscribe(cb: (message: Record<string, unknown>) => void): void;
    unsubscribe(): void;
  }

  const ROSLIB: {
    Ros: typeof Ros;
    Topic: typeof Topic;
  };

  export default ROSLIB;
}
