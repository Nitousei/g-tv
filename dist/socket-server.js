"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_1 = require("socket.io");
var http_1 = require("http");
var ioredis_1 = __importDefault(require("ioredis"));
// 使用独立的 Redis 实例，避免与 Next.js 混用造成连接问题（虽然 ioredis 支持共享，但为了稳定性分开实例化）
var redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
var httpServer = (0, http_1.createServer)();
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // 允许所有来源，生产环境应限制
        methods: ["GET", "POST"]
    }
});
var PORT = 3001;
// 房间键名辅助函数
var getKey = {
    room: function (code) { return "room:".concat(code); },
    members: function (code) { return "room:".concat(code, ":members"); },
};
io.on('connection', function (socket) {
    console.log('Client connected:', socket.id);
    // 加入房间
    socket.on('join-room', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var roomExists, membersJson, members, existingMemberIndex, newUser, hostId, roomStateJson, roomState, hostMember;
        var roomCode = _b.roomCode, user = _b.user, create = _b.create;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("[JOIN] Room: ".concat(roomCode, ", User: ").concat(user.id, " (").concat(user.name, "), Create: ").concat(create, ", Socket: ").concat(socket.id));
                    return [4 /*yield*/, redis.exists(getKey.room(roomCode))];
                case 1:
                    roomExists = _c.sent();
                    if (!create && !roomExists) {
                        console.log("[JOIN] Room ".concat(roomCode, " not found"));
                        socket.emit('error', '房间不存在');
                        return [2 /*return*/];
                    }
                    socket.join(roomCode);
                    return [4 /*yield*/, redis.lrange(getKey.members(roomCode), 0, -1)];
                case 2:
                    membersJson = _c.sent();
                    console.log("[JOIN] Existing members count: ".concat(membersJson.length));
                    members = [];
                    try {
                        members = membersJson.map(function (m) { return JSON.parse(m); });
                    }
                    catch (e) {
                        console.error("[JOIN] Error parsing members:", e);
                        // If corruption, maybe clear correctly? 
                        // For now, assume empty if parse fails to avoid crash
                    }
                    existingMemberIndex = members.findIndex(function (m) { return Number(m.id) === Number(user.id); });
                    if (!(existingMemberIndex === -1)) return [3 /*break*/, 4];
                    newUser = { id: user.id, username: user.name, socketId: socket.id };
                    members.push(newUser);
                    return [4 /*yield*/, redis.rpush(getKey.members(roomCode), JSON.stringify(newUser))];
                case 3:
                    _c.sent();
                    console.log("[JOIN] Added new user ".concat(user.id));
                    return [3 /*break*/, 6];
                case 4:
                    // 更新 socketId
                    members[existingMemberIndex].socketId = socket.id;
                    return [4 /*yield*/, redis.lset(getKey.members(roomCode), existingMemberIndex, JSON.stringify(members[existingMemberIndex]))];
                case 5:
                    _c.sent();
                    console.log("[JOIN] Updated socket for user ".concat(user.id));
                    _c.label = 6;
                case 6:
                    hostId = -1;
                    return [4 /*yield*/, redis.get(getKey.room(roomCode))];
                case 7:
                    roomStateJson = _c.sent();
                    roomState = roomStateJson ? JSON.parse(roomStateJson) : null;
                    if (!!roomState) return [3 /*break*/, 9];
                    // 新房间
                    hostId = user.id;
                    roomState = {
                        hostId: hostId,
                        currentVideo: null,
                        currentEpisodeIndex: 0,
                        isPlaying: false,
                        currentTime: 0,
                        lastUpdate: Date.now()
                    };
                    return [4 /*yield*/, redis.set(getKey.room(roomCode), JSON.stringify(roomState), 'EX', 24 * 60 * 60)];
                case 8:
                    _c.sent(); // 24小时过期
                    console.log("[JOIN] Created new room state with host ".concat(hostId));
                    return [3 /*break*/, 11];
                case 9:
                    hostId = roomState.hostId;
                    if (!!members.find(function (m) { return m.id === hostId; })) return [3 /*break*/, 11];
                    console.log("[JOIN] Host ".concat(hostId, " not in members. Resetting to ").concat(members[0].id));
                    hostId = members[0].id;
                    roomState.hostId = hostId;
                    return [4 /*yield*/, redis.set(getKey.room(roomCode), JSON.stringify(roomState))];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11:
                    console.log("[JOIN] Emitting room-update. Members: ".concat(members.length, ", Host: ").concat(hostId));
                    // 广播房间信息
                    io.to(roomCode).emit('room-update', {
                        members: members,
                        hostId: hostId,
                        roomState: roomState
                    });
                    // 只有在加入时，如果是普通成员，请求同步
                    if (hostId !== user.id) {
                        hostMember = members.find(function (m) { return m.id === hostId; });
                        if (hostMember) {
                            io.to(hostMember.socketId).emit('request-sync', { requesterId: socket.id });
                        }
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    // 离开房间
    socket.on('leave-room', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var roomCode = _b.roomCode, userId = _b.userId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, handleLeave(roomCode, userId, socket)];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // 断开连接
    socket.on('disconnect', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    }); });
    // 收到同步数据（Host 发送）
    socket.on('sync-video', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var roomStateJson, current, newState;
        var roomCode = _b.roomCode, state = _b.state;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, redis.get(getKey.room(roomCode))];
                case 1:
                    roomStateJson = _c.sent();
                    if (!roomStateJson) return [3 /*break*/, 3];
                    current = JSON.parse(roomStateJson);
                    newState = __assign(__assign(__assign({}, current), state), { lastUpdate: Date.now() });
                    return [4 /*yield*/, redis.set(getKey.room(roomCode), JSON.stringify(newState))];
                case 2:
                    _c.sent();
                    // 广播给房间内所有人（除了发送者）
                    // 客户端采用了乐观更新，所以不需要发回给发送者，否则会导致 playback 状态跳变
                    socket.to(roomCode).emit('sync-video', newState);
                    _c.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // 特定用户请求 Host 同步的回应
    socket.on('respond-sync', function (_a) {
        var requesterId = _a.requesterId, state = _a.state;
        io.to(requesterId).emit('sync-video', state);
    });
    // Helper: 处理离开
    function handleLeave(roomCode, userId, socket) {
        return __awaiter(this, void 0, void 0, function () {
            var membersJson, members, index, pipeline_1, roomStateJson, roomState;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        socket.leave(roomCode);
                        return [4 /*yield*/, redis.lrange(getKey.members(roomCode), 0, -1)];
                    case 1:
                        membersJson = _a.sent();
                        members = membersJson.map(function (m) { return JSON.parse(m); });
                        index = members.findIndex(function (m) { return m.id === userId; });
                        if (!(index !== -1)) return [3 /*break*/, 4];
                        // 从 Redis 移除
                        // lrem 只能按值移除，由于 socketId 可能变，我们最好重写 list
                        // 简单点：filter 后 delete key 再 rpush 所有（并发不安全，但简单）
                        // 或者用 lrem 如果保证 JSON 字符串完全一致
                        // 这里我们用 filter + 重写
                        members = members.filter(function (m) { return m.id !== userId; });
                        return [4 /*yield*/, redis.del(getKey.members(roomCode))];
                    case 2:
                        _a.sent();
                        if (!(members.length > 0)) return [3 /*break*/, 4];
                        pipeline_1 = redis.pipeline();
                        members.forEach(function (m) { return pipeline_1.rpush(getKey.members(roomCode), JSON.stringify(m)); });
                        return [4 /*yield*/, pipeline_1.exec()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        if (!(members.length === 0)) return [3 /*break*/, 6];
                        // 房间空了，删除
                        return [4 /*yield*/, redis.del(getKey.room(roomCode))];
                    case 5:
                        // 房间空了，删除
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 6: return [4 /*yield*/, redis.get(getKey.room(roomCode))];
                    case 7:
                        roomStateJson = _a.sent();
                        if (!roomStateJson) return [3 /*break*/, 10];
                        roomState = JSON.parse(roomStateJson);
                        if (!(roomState.hostId === userId)) return [3 /*break*/, 9];
                        // Host 离开了，移交给下一个人 (members[0])
                        roomState.hostId = members[0].id;
                        return [4 /*yield*/, redis.set(getKey.room(roomCode), JSON.stringify(roomState))];
                    case 8:
                        _a.sent();
                        io.to(roomCode).emit('system-message', "\u623F\u4E3B\u5DF2\u79BB\u5F00\uFF0C".concat(members[0].username, " \u6210\u4E3A\u65B0\u623F\u4E3B"));
                        _a.label = 9;
                    case 9:
                        // 广播更新
                        io.to(roomCode).emit('room-update', {
                            members: members,
                            hostId: roomState.hostId,
                            roomState: roomState
                        });
                        _a.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        });
    }
});
httpServer.listen(PORT, function () {
    console.log("Socket.IO server running on port ".concat(PORT));
});
