const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/browser',testMatch:["monitoramento-animal.spec.cjs","alerta-publico.spec.cjs"],
 fullyParallel:true,forbidOnly:!!process.env.CI,retries:0,workers:2,timeout:45000,
 expect:{timeout:5000},outputDir:".test-results/monitoramento-animal",
 reporter:[['list'],['html',{outputFolder:'.playwright-report/monitoramento-animal',open:'never'}],['json',{outputFile:'.test-results/monitoramento-animal/resultado.json'}]],
 use:{baseURL:'http://127.0.0.1:8784',isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'},
 projects:['chromium','webkit'].flatMap(browserName=>[390,320].map(width=>({
  name:browserName+'-'+width,use:{browserName,launchOptions:browserName==='chromium'&&process.env.MAPAS_CHROME_LOCAL?{channel:'chrome'}:{},viewport:{width,height:width===390?844:568}}
 }))),
 webServer:{command:'node tests/browser/servidor.cjs',url:'http://127.0.0.1:8784',reuseExistingServer:false,timeout:10000}
});
