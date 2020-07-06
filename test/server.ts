import { Registry, Provider, ProviderContext, PROVIDER_CONTEXT_STATUS, ProviderChunk, SwaggerProvider } from '../src';

class CUSTOM_SERVICE {
  hello(a: any) {
    console.log('hello的参数_____________：', a)
    return a;
  }
}

const registry = new Registry({
  host: '10.4.208.91:2181',
});

const provider = new Provider({
  application: 'test',  // 应用名
  dubbo_version: '2.0.2',   // dubbo版本
  port: 8080,        // 服务端口
  pid: process.pid,     // 服务进程ID
  registry,              // registry对象
  heartbeat: 60000,      // 心跳频率，如果不指定，那么不进行心跳。
});
const swagger = new SwaggerProvider('test', provider);
let closing = false;
process.on('SIGINT', () => {
  if (closing) return;
  closing = true;
  let closed = false;
  // provider.close 关闭服务
  // swagger.unPublish卸载
  swagger.unPublish().then(() => provider.close()).then(() => closed = true).catch(e => {
    console.error(e);
    closed = true;
  });
  setInterval(() => {
    if (closed) {
      console.log('closed')
      process.exit(0);
    }
  }, 300);
});

// 通过listen方法启动服务后，通过时间data来获取反序列化后的数据
provider.on('data', async (ctx: ProviderContext, chunk: ProviderChunk) => {
  // 反序列化数据
  const req = ctx.req;
  // 如果chunk.interfacetarget是一个class service
  // 那么可以这样写
  const app = new chunk.interfacetarget();
  const result = await app[req.method](...req.parameters);
  ctx.body = result;
  ctx.status = PROVIDER_CONTEXT_STATUS.OK;
});
// 添加服务
provider.addService(CUSTOM_SERVICE, {
  interface: 'com.mifa.test',    // 接口名
  version: '1.0.0',              // 接口修订版本，不指定默认为version值
  methods: ['hello'],            // 方法列表
  parameters: [
    {
      name: 'hello',
      summary: '何洛洛我',
      input: [
        {
          $class: 'int',
          $schema: {
            type: 'int'
          }
        }
      ]
      // output: {
      //   type: 'integer'
      // }
    }
  ]
});

// provider.listen监听服务
// swagger.publish发布服务
provider.listen().then(() => swagger.publish()).then(() => console.log('service published')).catch(e => console.error(e));
