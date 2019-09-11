// ==UserScript==
// @name        �����������μ��(���ݰ�)
// @version     ����(beta)0.3
// @description 1.����֧�����û����������˺ţ�¥��¥δ��ȫ��֤����2.�޸�Ϊֻ�ڸ������ɵ������б�������������� 3.����������������ʽ����ʧ��ˢ�����ɼ���
// @include     http*://tieba.baidu.com/p/*
// @include     http*://tieba.baidu.com/f?*
// @grant       none
// @license     GPL-3.0
// @author      shitianshiwa,864907600cc(ԭ��Ŀ)
// @namespace   https://github.com/FirefoxBar/userscript/raw/master/Tieba_Blocked_Detect/Tieba_Blocked_Detect.user.js
// @downloadURL  https://github.com/shitianshiwa/baidu-tieba-userscript/
// ==/UserScript==
//����֧�����û����������˺ţ�¥��¥δ��ȫ��֤����
//�޸�Ϊֻ�ڸ������ɵ������б��������������
//���������������������ʽ����ʧ��ˢ�����ɼ���

(function($)
 {
    'use strict';
    const threadCache = {};
    const replyCache = {};
    var t1,t2,t3,t4;//��ʱ��`
    const css1=`
/*�̶�����ҳ�ұ�*/
.miaocsss2
{
width:120px;
height:120px;
position: fixed;
right:30px;
bottom:440px;
z-index: 1005;
color:#f00;
font-size:10px;
font-weight:bold;
}
`;
    /**
 * �����װ fetch �����Դ����� + ͨ������ + �Զ� .text()
 *
 * @param {string} url - ���� URL
 * @param {object} [options={}] - fetch Request ����
 * @returns {Promise<string>} fetch ����
 */
    const request = (url, options = {}) => fetch(url, Object.assign(
        {
            credentials: 'omit',
            // �������ɣ��� firefox �ɣ���ǿ����ת�� http
            redirect: 'follow',
            // ��ֹ��������� CORS ���� HEAD ����ͷ
            mode: 'same-origin',
            headers:
            {
                'X-Requested-With': 'XMLHttpRequest'
            }
        }, options)).then(res => res.text());

    /**
 * ��ȡ��ǰ�û��Ƿ��¼
 *
 * @returns {number|boolean} �Ƿ��¼�����ѵ�¼������ҳΪ 1������ҳΪ true
 */
    const getIsLogin = () => window.PageData.user.is_login;
    /**
 * ��ȡ��ǰ�û���id
 *
 * @returns {string} id
 */
    const getUserid = () => window.PageData.user.id;
    /**
 * ��ȡ��ǰ�û����û���
 *
 * @returns {string} �û���
 */
    const getUsername = () => window.PageData.user.name || window.PageData.user.user_name;
    /**
 * ��ȡ \u ��ʽ�� unicode �ַ���
 *
 * @param {string} str - ��Ҫת����ַ���
 * @returns {string} ת�����ַ���
 */
    const getEscapeString = str => escape(str).replace(/%/g, '\\').toLowerCase();

    /**
 * ��ȡ���������ƶ��˵�ַ
 *
 * @param {number} tid - ���� id
 * @returns {string} URL
 */
    const getThreadMoUrl = tid => `//tieba.baidu.com/mo/q-----1-1-0----/m?kz=${tid}`;//�������ж�

    /**
 * ��ȡ�ظ������ƶ��˵�ַ
 *
 * @param {number} tid - ���� id
 * @param {number} pid - �ظ� id
 * @param {number} [pn=0] - ҳ��
 * @returns {string} URL
 */
    const getReplyMoUrl = (tid, pid, pn = 0) => `//tieba.baidu.com/mo/q-----1-1-0----/flr?pid=${pid}&kz=${tid}&pn=${pn}`;//¥���ж�

    /**
 * ��ȡ�ظ����� ajax ��ַ
 *
 * @param {number} tid - ���� id
 * @param {number} pid - ���ظ� id
 * @param {number} spid - ¥��¥�ظ� id
 * @param {number} [pn=0] - ҳ��
 * @returns {string} URL
 */
    const getReplyUrl = (tid, pid, pn = 0) => `//tieba.baidu.com/p/comment?tid=${tid}&pid=${pid}&pn=${pn}&t=${Date.now()}`;//¥��¥�ж�

    /**
 * ��ҳ�������ж������Ƿ�ֱ����ʧ
 *
 * @param {string} res - ҳ������
 * @returns {boolean} �Ƿ�����
 */
    const threadIsNotExist = res => res.indexOf('��Ҫ��������Ӳ�����') >= 0;

    /**
 * ��ȡ�������Ƿ�����
 *
 * @param {number} tid - ���� id
 * @returns {Promise<boolean>} �Ƿ�����
 */
    const getThreadBlocked = tid => request(getThreadMoUrl(tid))
    .then(threadIsNotExist);

    /**
 * ��ȡ�ظ����Ƿ�����
 *
 * @param {number} tid - ���� id
 * @param {number} pid - �ظ� id
 * @returns {Promise<boolean>} �Ƿ�����
 */
    const getReplyBlocked = (tid, pid) => request(getReplyMoUrl(tid, pid))
    .then(res => threadIsNotExist(res) || res.indexOf('ˢ��</a><div>¥.&#160;<br/>') >= 0);

    /**
 * ��ȡ¥��¥�Ƿ�����
 *
 * @param {number} tid - ���� id
 * @param {number} pid - ���ظ� id
 * @param {number} spid - ¥��¥�ظ� id
 * @returns {Promise<boolean>} �Ƿ�����
 */
    const getLzlBlocked = (tid, pid, spid) => request(getReplyUrl(tid, pid))
    // ¥��¥ ajax ��ҳ�����ε�¥��¥����չʾ�����Բ���Ҫ���� pn��ͬ����Ҫ���ǲ��ڵ�һҳ��¥��¥
    .then(res => threadIsNotExist(res) || res.indexOf(`<a rel="noopener" name="${spid}">`) < 0);

    /**
 * ��ȡ���� CSS ��ʽ
 *
 * @param {string} username - �û���
 * @returns {string} ��ʽ��
 */
    const getTriggerStyle = (username) =>
    {
        const escapedUsername = getEscapeString(username).replace(/\\/g, '\\\\');

        return `
/* ʹ�� animation ��� DOM �仯 */
@-webkit-keyframes __tieba_blocked_detect__ {}
@-moz-keyframes __tieba_blocked_detect__ {}
@keyframes __tieba_blocked_detect__ {}

/* ������ */
#thread_list .j_thread_list[data-field*='"author_name":"${escapedUsername}"'],
/* �ظ��� */
#j_p_postlist .l_post[data-field*='"user_name":"${escapedUsername}"'],
/* ¥��¥ */
.j_lzl_m_w .lzl_single_post[data-field*="'user_name':'${username}'"] {
-webkit-animation: __tieba_blocked_detect__;
-moz-animation: __tieba_blocked_detect__;
animation: __tieba_blocked_detect__;
}

/* ��������ʽ */
.__tieba_blocked__,
.__tieba_blocked__ .d_post_content_main {
background: rgba(255, 0, 0, 0.1);
position: relative;
}
.__tieba_blocked__.core_title {
background: #fae2e3;
}
.__tieba_blocked__::after {
background: #f22737;
position: relative;
padding: 5px 10px;
color: #ffffff;
font-size: 14px;
line-height: 1.5em;
z-index: 399;
}
.__tieba_blocked__.lzl_single_post {
margin-left: -15px;
margin-right: -15px;
margin-bottom: -6px;
padding-left: 15px;
padding-right: 15px;
padding-bottom: 6px;
}

.__tieba_blocked__.j_thread_list::after,
.__tieba_blocked__.core_title::after {
content: '�����ѱ�����';
right: 0;
top: 0;
}
.__tieba_blocked__.l_post::after {
content: '��¥���ѱ�����';
right: 0;
top: 0;
}
.__tieba_blocked__.lzl_single_post::after {
content: '��¥��¥�ѱ�����';
left: 0;
bottom: 0;
}
`;
    };

    /**
 * �������/�ظ����λص�����
 *
 * @param {AnimationEvent} event - �������¼�����
 */
    //�������б�
    const detectBlocked0 = () =>
    {
        //$(".tb_icon_author").parents('li.j_thread_list')
        //JSON.parse($(".tb_icon_author").attr("data-field")).user_id
        clearTimeout(t1);
        var TID1=new Array();
        var tizi1=new Array();
        var index1=0;
        $(".tb_icon_author").each(
            function()
            {
                //alert(JSON.parse($(this).attr("data-field")).user_id+","+getUserid());
                if(JSON.parse($(this).attr("data-field")).user_id==getUserid()&&$(this)[0].classList.contains("__tieba_blocked__")==false)
                {
                    const tid = $(this).parents('li.j_thread_list').attr('data-tid');//�ӽڵ��Ҹ��ڵ�
                    TID1[index1]=tid;
                    tizi1[index1]=$(this);
                    index1++;
                }
            });
        t4=setInterval(tzaction,400);
        function tzaction()
        {
            $("#miaocount1").html("1.ʣ������������"+index1);
            if(index1>0)
            {
                index1--;
            }
            else
            {
                clearInterval(t4);
                return;
            }
            let checker;
            const tid = TID1[index1]
            if (threadCache[tid])
            {
                checker = threadCache[tid];
            }
            else
            {
                checker = getThreadBlocked(tid).then(result =>{
                    threadCache[tid] = result;
                    saveCache('thread');
                    return result;
                });
            }
            if (checker)
            {
                Promise.resolve(checker).then(result =>{
                    if (result)
                    {
                        tizi1[index1].parents('li.j_thread_list')[0].classList.add("__tieba_blocked__");//�ӽڵ��Ҹ��ڵ�
                        //alert(result);
                        //alert("460");
                    }
                });
            }
        }
    }

    //¥��
    const detectBlocked = () =>
    {
        //document.querySelectorAll(".l_post")[0].classList.add("__tieba_blocked__")//���������ʽ
        //JSON.parse(($(".l_post")).attr('data-field')).author.user_id
        //j_thread_list clearfix �������б�
        //l_post l_post_bright j_l_post clearfix  ¥��
        //lzl_single_post ¥��¥

        clearTimeout(t2);
        var TID2=new Array();
        var PID2=new Array();
        var tizi2=new Array();
        var index2=0;
        $("div.l_post").each(
            function()
            {
                if(JSON.parse(($(this)).attr('data-field')).author.user_id==getUserid()&&$(this)[0].classList.contains("__tieba_blocked__")==false)
                {
                    const tid = window.PageData.thread.thread_id; //const tid = JSON.parse(($(".l_post")).attr('data-field')).content.thread_id;
                    const pid = $(this).attr('data-pid')|| '';
                    TID2[index2]=tid;
                    PID2[index2]=pid;
                    tizi2[index2]=$(this);
                    index2++;
                    //console.log(tizi2.length);
                    //alert("233");
                    //console.log(tid);
                    //console.log(pid);
                }
            });
        t3=setInterval(lcaction,500);
        function lcaction()
        {
            //alert("2333");
            $("#miaocount2").html("2.ʣ����¥������"+index2);
            if(index2>0)
            {
                index2--;
            }
            else
            {
                clearInterval(t3);
                return;
            }
            const tid = TID2[index2]
            const pid = PID2[index2]
            let checker;
            if (!pid)
            {
                // �»ظ�����û�� pid
                return;
            }
            if (replyCache[pid])
            {
                checker = replyCache[pid];
            }
            else
            {
                checker = getReplyBlocked(tid, pid).then(result =>{
                    //console.log("233");
                    replyCache[pid] = result;
                    saveCache('reply');
                    //alert(result)
                    return result;
                });
            }
            if (checker)
            {
                Promise.resolve(checker).then(result =>{
                    if (result)
                    {
                        tizi2[index2][0].classList.add("__tieba_blocked__");
                        //console.log(index2);
                        //alert(result);
                        //alert("460");
                    }
                });
            }
        }
    };
    //alert(checker);
    //¥��¥
    const detectBlocked2 = (event) =>
    {
        if (event.animationName !== '__tieba_blocked_detect__')
        {
            return;
        }
        //detectBlocked();
        const { target } = event;
        const { classList } = target;
        let checker;
        if (classList.contains('lzl_single_post'))
        {
            //alert("450");
            const field = target.dataset.field || '';
            const parent = target.parentElement;
            const pageNumber = parent.querySelector('.tP');
            if (pageNumber && pageNumber.textContent.trim() !== '1')
            {
                // ��ҳ���¥��¥������ʾ���ε�¥��¥���������е�¥��¥һ���ǲ������εģ�����Ҫ����
                return;
            }
            const tid = window.PageData.thread.thread_id;
            const pid = (field.match(/'pid':'?(\d+)'?/) || [])[1];
            const spid = (field.match(/'spid':'?(\d+)'?/) || [])[1];
            if (!spid)
            {
                // �»ظ�û�� spid
                return;
            }
            if (replyCache[spid])
            {
                checker = replyCache[spid];
            }
            else
            {
                checker = getLzlBlocked(tid, pid, spid).then(result =>{
                    replyCache[spid] = result;
                    saveCache('reply');
                    return result;
                });
            }
        }
        if (checker)
        {
            Promise.resolve(checker).then(result =>{
                if (result)
                {
                    classList.add("__tieba_blocked__");
                    //alert(result);
                    //alert("460");
                }
            });
        }
    };
    //https://www.cnblogs.com/yunfeifei/p/4453690.html

    /**
* ��ʼ����ʽ
*
* @param {string} username - �û���
*/
    const initStyle = (username) =>
    {
        const style = document.createElement('style');
        style.textContent = getTriggerStyle(username);
        document.head.appendChild(style);
    };

    /**
 * ��ʼ���¼�����
 *
 */
    const initListener = () =>
    {
        document.addEventListener('webkitAnimationStart',detectBlocked2, false);//����¼�ֻ���Լ�������������(¥��¥)
        document.addEventListener('MSAnimationStart', detectBlocked2, false);
        document.addEventListener('animationstart', detectBlocked2, false);
    };
    /*
    http://www.softwhy.com/article-9936-1.html
    JavaScript animationStart �¼�
    ��1��.IE10+�����֧�ִ��¼���
    ��2��.�ȸ������֧�ִ��¼�����ǰ��Ҫ��webkitǰ׺����
    ��3��.��������֧�ִ��¼�����ǰ��Ҫ��mozǰ׺����
    ��4��.opera�����֧�ִ��¼�����ǰ��Ҫ��oǰ׺����
    ��5��.safria�����֧�ִ��¼�����ǰ��Ҫ��webkitǰ׺����
    ������÷�
    animationstart �¼��� CSS ������ʼ����ʱ������
    CSS ��������ʱ���ᷢ�����������¼���
    animationstart - CSS ������ʼ�󴥷�
    animationiteration - CSS �����ظ�����ʱ����
    animationend - CSS ������ɺ󴥷�
    true - �¼�����ڲ���׶�ִ��
    false- Ĭ�ϡ��¼������ð�ݽ׶�ִ��
*/

    /**
* ���ز�û��ʲô���õĻ���
*
*/
    const loadCache = () =>
    {
        const thread = sessionStorage.getItem('tieba-blocked-cache-thread');
        const reply = sessionStorage.getItem('tieba-blocked-cache-reply');
        if (thread)
        {
            try
            {
                threadCache = JSON.parse(thread);
            }
            catch (error)
            {
                //alert(error);
            }
        }
        if (reply)
        {
            try
            {
                replyCache = JSON.parse(reply);
            }
            catch (error)
            {
                //alert(error);
            }
        }
    }

    /**
* ���沢û��ʲô���õĻ���
*
* @param {string} key - ���� key
*/
    const saveCache = (key) =>
    {
        if (key === 'thread')
        {
            sessionStorage.setItem('tieba-blocked-cache-thread', JSON.stringify(threadCache));
        }
        else if (key === 'reply')
        {
            sessionStorage.setItem('tieba-blocked-cache-reply', JSON.stringify(replyCache));
        }
    }

    /**
* ��ʼ��ִ��
*
*/
    const init = () =>
    {
        if (getIsLogin())
        {
            const username = getUsername();
            loadCache();
            initStyle(username);
            t1=setTimeout(detectBlocked0,1000);//�������б�
            t2=setTimeout(detectBlocked,1000);//���������¥��
            initListener();//���������¥�����¥��¥
            const style = document.createElement('style');//��������ʽ�ڵ�
            style.textContent = css1;//�����ʽ����
            document.head.appendChild(style);//��headͷ�������ʽ�ڵ�
            $("body").append('<div class="miaocsss2"><span>�������μ��</span><br/><span id="miaocount1">1.ʣ����������:</span><br/><span id="miaocount2">2.ʣ����¥����:</span></div>');
        }
    }
    init();
})($);