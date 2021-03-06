// ==UserScript==
// @name         修复电脑端贴吧主题贴内的楼层列表,让楼中楼和吧友头像可以正常加载(beta)
// @namespace    http://tampermonkey.net/
// @version      0.12
// @description  手机端可能使用这个可能会有问题，所以单独弄一个脚本
// @author       shitianshiwa
// @include      http*://tieba.baidu.com/p/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://github.com/shitianshiwa/baidu-tieba-userscript/
// ==/UserScript==

(function() {
    'use strict';
    var $ = window.jQuery;
    function fixzhutitie()
    {
        try
        {
            var hrefs=window.location.href;
            if(hrefs.split("/")[3]!="p")
            {
                return;
            }
            $("li.l_pager").children("a").each(function()
                                               {
                if($(this)[0]!=null)
                {
                    if($(this)[0].className!="miaoyou01")
                    {
                        $(this)[0].classList.add("miaoyou01");
                        let a=$(this).attr("href");//得到链接字符串
                        a="//tieba.baidu.com"+a;//字符串相加
                        //console.log(a);
                        $(this).attr("href",a);//改变原来的链接
                    }
                }
            });
        }
        catch(error)
        {
            // clearInterval(t2);
            alert(error+",修复主题贴内的楼层列表未正常运行");
        }
    }
    fixzhutitie();
    //var t2=setInterval(fixzhutitie,1000);//每秒1s工作一次
})();