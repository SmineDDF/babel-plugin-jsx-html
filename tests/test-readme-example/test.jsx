const Foo = ({ style }, children) => {
  return (
    <div style={style}>
      Green text before children
      {...children}
    </div>
  );
};

const Bar = ({ src }) => {
  return (
    <div style="background:red;">
      <img src={src} style="opacity:0.7;" />
    </div>
  );
};

const Baz = () => {
  return (
    <Foo style="color:green;">
      <div>Something before Bar</div>
      <Bar src="/some-image.png" />
    </Foo>
  );
};

export default Baz;
