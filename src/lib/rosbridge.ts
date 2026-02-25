import ROSLIB from 'roslib';

export interface RosTopicInfo {
  name: string;
  type: string;
}

export type RosConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface RosbridgeOptions {
  onStateChange?: (state: RosConnectionState, errorMessage?: string) => void;
}

type MessageCallback = (message: Record<string, unknown>) => void;

export class RosbridgeClient {
  private ros: any = null;

  private state: RosConnectionState = 'DISCONNECTED';

  private subscriptions = new Map<string, any>();

  private onStateChange?: RosbridgeOptions['onStateChange'];

  constructor(options: RosbridgeOptions = {}) {
    this.onStateChange = options.onStateChange;
  }

  get connectionState() {
    return this.state;
  }

  connect(url: string): Promise<void> {
    const wsUrl = url.trim();
    if (!wsUrl) {
      return Promise.reject(new Error('wsUrl is empty'));
    }

    this.disconnect();
    this.setState('CONNECTING');

    return new Promise((resolve, reject) => {
      const ros = new ROSLIB.Ros({ url: wsUrl });

      const handleConnected = () => {
        ros.off('connection', handleConnected);
        ros.off('error', handleError);
        ros.off('close', handleClose);
        this.ros = ros;

        ros.on('error', (event: unknown) => {
          this.setState('ERROR', this.stringifyError(event));
        });
        ros.on('close', () => {
          this.setState('DISCONNECTED');
          this.unsubscribeAll();
          this.ros = null;
        });

        this.setState('CONNECTED');
        resolve();
      };

      const handleError = (event: unknown) => {
        ros.off('connection', handleConnected);
        ros.off('error', handleError);
        ros.off('close', handleClose);
        this.setState('ERROR', this.stringifyError(event));
        reject(new Error(this.stringifyError(event)));
      };

      const handleClose = () => {
        ros.off('connection', handleConnected);
        ros.off('error', handleError);
        ros.off('close', handleClose);
        this.setState('DISCONNECTED');
        reject(new Error('rosbridge disconnected before connection established'));
      };

      ros.on('connection', handleConnected);
      ros.on('error', handleError);
      ros.on('close', handleClose);
    });
  }

  disconnect() {
    this.unsubscribeAll();
    if (this.ros) {
      this.ros.close();
      this.ros = null;
    }
    this.setState('DISCONNECTED');
  }

  async getTopics(): Promise<RosTopicInfo[]> {
    const ros = this.ensureRos();

    return new Promise((resolve, reject) => {
      ros.getTopics(
        (result: { topics: string[]; types: string[] }) => {
          const rows = result.topics.map((topic, index) => ({
            name: topic,
            type: result.types[index] || 'unknown',
          }));
          resolve(rows);
        },
        (error: unknown) => reject(new Error(this.stringifyError(error))),
      );
    });
  }

  async getTopicType(topicName: string): Promise<string> {
    const ros = this.ensureRos();

    return new Promise((resolve, reject) => {
      ros.getTopicType(
        topicName,
        (topicType: string) => resolve(topicType || 'unknown'),
        (error: unknown) => reject(new Error(this.stringifyError(error))),
      );
    });
  }

  subscribe(topicName: string, messageType: string, callback: MessageCallback, throttleRate = 0) {
    const ros = this.ensureRos();
    const topicKey = topicName.trim();
    if (!topicKey) throw new Error('topic name is empty');

    this.unsubscribe(topicKey);

    const topic = new ROSLIB.Topic({
      ros,
      name: topicKey,
      messageType,
      throttle_rate: throttleRate,
      queue_length: 1,
    });

    topic.subscribe((message: Record<string, unknown>) => {
      callback(message);
    });

    this.subscriptions.set(topicKey, topic);
  }

  unsubscribe(topicName: string) {
    const key = topicName.trim();
    const topic = this.subscriptions.get(key);
    if (!topic) return;

    topic.unsubscribe();
    this.subscriptions.delete(key);
  }

  unsubscribeAll() {
    this.subscriptions.forEach((topic) => {
      topic.unsubscribe();
    });
    this.subscriptions.clear();
  }

  private ensureRos(): any {
    if (!this.ros) {
      throw new Error('rosbridge is not connected');
    }
    return this.ros;
  }

  private setState(state: RosConnectionState, errorMessage?: string) {
    this.state = state;
    this.onStateChange?.(state, errorMessage);
  }

  private stringifyError(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'unknown error';
    }
  }
}
