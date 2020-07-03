import { Registry, Consumer, SwaggerConsumer } from '../src';
import * as http from 'http';
const java = require('js-to-java');

const registry = new Registry({
    host: '10.4.208.91:2181',
});

// 创建一个消费者对象
const consumer = new Consumer({
    application: 'test',
    dubbo_version: '2.7.3',
    pid: process.pid,
    registry: registry,
});
const swagger = new SwaggerConsumer('test', registry);
let closing = false;
process.on('SIGINT', () => {
    if (closing) return;
    closing = true;
    let closed = false;
    // 停止服务
    consumer.close().then(() => closed = true).catch(e => {
        console.error(e);
        closed = true;
    })
    setInterval(() => {
        if (closed) {
            console.log('closed')
            process.exit(0);
        }
    }, 300);
});

// 监听消费者
consumer.listen().then(() => new Promise((resolve) => {
    http.createServer((req, res) => {
        (async () => {
            // 调用一个服务，返回一个invoker对象
            const invoker = await consumer.get('com.sensetime.ad.mgt.api.service.IAccountService', '1.0.0');
            // 调用服务的方法 [Invoker].invoke(methodName, methodArgs);
            // methodName 方法名
            // methodArgs 方法参数数组
            let java_ = java.combine('int', 1)
            // console.log('java_~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', java_)
            return await invoker.invoke('getAccountByAccountId', [java_]);
            // 这个是要注释掉？
            return swagger.get();
        })().then((Response: any) => {
            // res.setDefaultEncoding('utf8');
            console.log('JSON.stringify(data)+++++++++++', Response)
            res.end(JSON.stringify(Response));
        }).catch(e => {
            res.statusCode = 500;
            res.end(e.stack);
        });
    }).listen(9001, resolve)
})).then(() => console.log('client connected')).catch(e => console.error(e));
