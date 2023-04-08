import { none, some } from "fp-ts/lib/Option.js";
import * as t from "io-ts";

export const JoinGameCodec = t.type({
    message: t.literal('join_game'),
    username: t.string,
});

export type JoinGame = typeof JoinGameCodec._A;

export const LeaveGameCodec = t.type({
    message: t.literal('leave_game'),
});

export type LeaveGame = typeof LeaveGameCodec._A;

export const ErrorCodec = t.type({
    message: t.literal('error'),
    error: t.union([
      t.literal('username_in_use'),
      t.literal('unhandled_message'),
      t.literal('malformed_message'),
      t.literal('blank_username'),
    ]),
});

export type Error = typeof ErrorCodec._A;

export const PingCodec = t.type({
    message: t.literal('ping'),
});

export type Ping = typeof PingCodec._A;

export const PongCodec = t.type({
    message: t.literal('pong'),
});

export type Pong = typeof PongCodec._A;

export const MessageCodec = t.union([
  JoinGameCodec,
  LeaveGameCodec,
  ErrorCodec,
  PingCodec,
  PongCodec,
]);

export type Message = typeof MessageCodec._A;

export const extractJson = (rawJson: string) => {
    try {
      return some(JSON.parse(rawJson));
    } catch {
      return none;
    }
};

