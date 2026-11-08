// 回归测试：在 headless Chrome 里跑 index.html 的真实交互流程。
// 用法：python tests/run.py（把这段注入页面，结果写进 #test-result）
(function () {
  const out = [];
  const ok = (name, cond, info) => out.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ← ' + JSON.stringify(info)));
  const $$ = s => document.querySelector(s);
  const fire = (el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
  const sess = d => S.sessions.find(x => x.date === d);
  const go = (tab, view) => { VIEW = view; DRAFT = null; TD = null; document.querySelector(`nav [data-tab=${tab}]`).click(); };
  try {
    // 1. 11/7 预置记录
    const s7 = sess('2026-11-07');
    ok('11/7 有 5 个动作', s7 && Object.keys(s7.sets).length === 5, s7 && Object.keys(s7.sets));

    // 2. 已保存那天换动作，记录跟着走
    go('train', '2026-11-07');
    fire($$('.exsel[data-slot=d2d]'), 'd2d_uc');
    ok('换成单臂绳索弯举后记录跟着改', sess('2026-11-07').sets.d2d_uc && !sess('2026-11-07').sets.d2d_db, Object.keys(sess('2026-11-07').sets));

    // 3. 只改右边次数，保存后不跳回
    fire($$('.trin[data-id=d2d_uc][data-f=rR]'), '5.5');
    $$('[data-a=savesess]').click();
    ok('右边次数保存进数据', sess('2026-11-07').sets.d2d_uc.rR === 5.5, sess('2026-11-07').sets.d2d_uc);
    ok('保存后界面显示 5.5', $$('.trin[data-id=d2d_uc][data-f=rR]').value === '5.5', $$('.trin[data-id=d2d_uc][data-f=rR]').value);
    ok('保存后是绿色已保存', !!$$('.savedbox'), null);

    // 4. 只改左边重量
    go('train', '2026-11-07');
    fire($$('.trin[data-id=d2a][data-f=w]'), '42.5');
    $$('[data-a=savesess]').click();
    ok('左边重量保存', sess('2026-11-07').sets.d2a.w === 42.5, sess('2026-11-07').sets.d2a);

    // 5. 取消勾选再保存 = 删掉
    go('train', '2026-11-07');
    $$('[data-a=exok][data-id=d2e_lp]').click();
    $$('[data-a=savesess]').click();
    ok('取消勾选的动作被删掉', !sess('2026-11-07').sets.d2e_lp, Object.keys(sess('2026-11-07').sets));

    // 6. 重新导入 Strong 不覆盖改过的记录
    importStrong(SEED_1107);
    ok('重新导入不覆盖手改', sess('2026-11-07').sets.d2a.w === 42.5 && !sess('2026-11-07').sets.d2e_lp, sess('2026-11-07').sets);

    // 7. 新的一天：建议来自之前的记录，按钮是保存
    go('train', '2026-11-08');
    if (!day('2026-11-08').train) $$('[data-a=trset][data-v="1"]').click();
    $$('[data-a=td][data-v=D2]').click();
    ok('新一天显示加重建议', $$('.trin[data-id=d2a][data-f=w]').value === '42.5', $$('.trin[data-id=d2a][data-f=w]').value);
    ok('新一天按钮是保存', !$$('.savedbox') && !!$$('[data-a=savesess]'), null);
    fire($$('.trin[data-id=d2c][data-f=w]'), '45');
    $$('[data-a=savesess]').click();
    ok('新一天保存成功', sess('2026-11-08') && sess('2026-11-08').sets.d2c.w === 45, sess('2026-11-08'));
    go('train', '2026-11-08');
    ok('新一天保存后绿色', !!$$('.savedbox'), null);

    // 8. 体重两位小数 + 绿色
    go('today', '2026-11-08');
    $$('#w').value = '68.55'; $$('[data-a=w]').click();
    ok('体重存两位小数', day('2026-11-08').w === 68.55, day('2026-11-08').w);
    ok('体重框变绿', $$('#w').classList.contains('saved'), null);

    // 9. 早餐组合
    $$('[data-a=edit][data-k=bfast]').click();
    $$('[data-a=ip][data-i="1"]').click();
    ok('早餐换成 3 全蛋', JSON.stringify(day('2026-11-08').bf) === JSON.stringify([['egg', 3], ['oil', 5]]), day('2026-11-08').bf);
    $$('#sheet').innerHTML = '';
  } catch (e) { out.push('FAIL 异常 ' + e.message); }
  document.body.insertAdjacentHTML('afterbegin', '<pre id="test-result">' + out.join('\n') + '</pre>');
})();
