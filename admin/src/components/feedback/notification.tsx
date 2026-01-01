import { message } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { MdCheckCircle, MdOutlineError } from 'react-icons/md';

let api: NotificationInstance | null = null;

export const setNotificationApi = (apiRef: NotificationInstance) => {
  api = apiRef;
};

export const notify = {
  error: (msg: string) => {
    api?.open({
      message: msg,
      icon: <MdOutlineError color="var(--color-red-6)" />,
      className: 'error-notification',
      style: {
        padding: 'var(--x3)',
        paddingBottom: 'var(--x2)',
      },
    });
  },
  internalError: () => {
    api?.open({
      message: 'Internal error',
      icon: <MdOutlineError color="var(--color-red-6)" />,
      style: {
        padding: 'var(--x3)',
        paddingBottom: 'var(--x2)',
      },
    });
  },
  success: (msg: string) => {
    api?.open({
      message: msg,
      icon: <MdCheckCircle color="var(--color-green-6)" />,
      style: {
        padding: 'var(--x3)',
        paddingBottom: 'var(--x2)',
      },
    });
  },
  info: (msg: string) => {
    api?.open({
      message: msg,
      style: {
        padding: 'var(--x3)',
        paddingBottom: 'var(--x2)',
      },
    });
  },
};

export const notifyMessage = {
  error: (msg: string) => {
    message.error({ content: msg });
  },
  internalError: () => {
    message.error({ content: 'Internal error', duration: 1 });
  },
  success: (msg: string) => {
    message.success({ content: msg, duration: 1 });
  },
  info: (msg: string) => {
    message.info({ content: msg, duration: 1 });
  },
  warning: (msg: string) => {
    message.warning({ content: msg, duration: 1 });
  },
};
