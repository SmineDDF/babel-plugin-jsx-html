const Template = ({ prop }: { prop: number }, children: string[]) => (
  <div>
    {prop} first child: {children[0]}
  </div>
);
const Gus = () => 42;
const Foo = {
  bar: () => <div>bar</div>,
};
const funcCall = () => 123;
const spread = { a: "spread prop", b: "spread prop 2" };
// eslint-disable-next-line no-unused-vars
const lowercaseFirstLetterElementInScope = () => <div>i should not render</div>;

export default () => {
  return (
    <>
      <a href="http://me.example.com">link</a>
      <div
        data-something="value"
        num={4}
        shownAsFalseString={false}
        shownAsBooleanTrueFlag
        notShownAtAll={undefined}
        amo={<Gus />}
        func={funcCall()}
        {...spread}
      >
        <lowercaseFirstLetterElementInScope />
        123
        {}
        <Template prop={123}>Jesse</Template>
        <b>child</b>
        <c />
        <></>
        <a-b-c-d />
        <Foo.bar></Foo.bar>
      </div>
    </>
  );
};
